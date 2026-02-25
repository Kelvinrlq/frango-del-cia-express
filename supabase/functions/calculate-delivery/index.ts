import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Restaurant coordinates (R. Dom Pedro I, 2310, Corumbá - MS)
const RESTAURANT_LAT = -19.00889;
const RESTAURANT_LON = -57.65130;

// Viewbox around Corumbá-MS for bounded geocoding
const VIEWBOX = "-57.72,-19.06,-57.58,-18.95";

// Priority order for geocoding result types
const TYPE_PRIORITY: Record<string, number> = {
  house: 1,
  building: 2,
  residential: 3,
  road: 4,
};

function selectBestResult(results: Array<{ lat: string; lon: string; type?: string; class?: string }>) {
  if (results.length === 1) return results[0];

  const sorted = [...results].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type || ""] ?? 99;
    const pb = TYPE_PRIORITY[b.type || ""] ?? 99;
    return pa - pb;
  });

  console.log("Geocoding results ranked:", sorted.map(r => ({ type: r.type, class: r.class, lat: r.lat, lon: r.lon })));
  return sorted[0];
}

async function geocodeStructured(
  API_KEY: string,
  street: string,
  number: string,
  neighborhood: string,
  city: string,
  state: string,
  postalcode?: string
) {
  // Use structured geocoding endpoint for better accuracy
  const streetWithNumber = `${number} ${street}`;
  const params = new URLSearchParams({
    key: API_KEY,
    street: streetWithNumber,
    city: city,
    state: state || "Mato Grosso do Sul",
    country: "Brazil",
    format: "json",
    limit: "5",
    addressdetails: "1",
    dedupe: "1",
    normalizecity: "1",
    viewbox: VIEWBOX,
  });
  if (neighborhood) {
    params.set("neighborhood", neighborhood);
  }
  if (postalcode) {
    params.set("postalcode", postalcode);
  }

  console.log("Trying structured geocoding:", streetWithNumber, neighborhood, city, state);
  const res = await fetch(`https://us1.locationiq.com/v1/search/structured?${params}`);
  if (!res.ok) {
    const errText = await res.text();
    console.warn("Structured geocoding failed:", res.status, errText);
    return null;
  }
  const data = await res.json();
  if (!data || data.length === 0) {
    console.warn("Structured geocoding returned no results");
    return null;
  }
  return data;
}

async function geocodeFreeform(
  API_KEY: string,
  address: string
) {
  const params = new URLSearchParams({
    key: API_KEY,
    q: address,
    format: "json",
    limit: "5",
    countrycodes: "br",
    viewbox: VIEWBOX,
    bounded: "1",
    addressdetails: "1",
    dedupe: "1",
    normalizecity: "1",
  });

  console.log("Trying freeform geocoding:", address);
  const res = await fetch(`https://us1.locationiq.com/v1/search?${params}`);
  if (!res.ok) {
    const errText = await res.text();
    console.warn("Freeform geocoding failed:", res.status, errText);
    return null;
  }
  const data = await res.json();
  if (!data || data.length === 0) {
    console.warn("Freeform geocoding returned no results");
    return null;
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("LOCATIONIQ_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { street, number, neighborhood, city, state, zipCode } = await req.json();
    if (!street || !number || !city) {
      return new Response(
        JSON.stringify({ error: "Endereço incompleto. Informe rua, número e cidade." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== GEOCODING DEBUG ===");
    console.log("Input:", { street, number, neighborhood, city, state, zipCode });

    // Try structured geocoding first (more accurate), then fallback to freeform
    let geoData = await geocodeStructured(API_KEY, street, number, neighborhood || "", city, state || "MS", zipCode);

    if (!geoData) {
      // Fallback: freeform geocoding
      const parts = [street, number, neighborhood, city, state || "MS", zipCode, "Brasil"].filter(Boolean);
      const address = parts.join(", ");
      geoData = await geocodeFreeform(API_KEY, address);
    }

    if (!geoData || geoData.length === 0) {
      console.error("All geocoding attempts failed");
      return new Response(
        JSON.stringify({ error: "Endereço não encontrado. Verifique o CEP, rua e número." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log all results for debugging
    console.log("Geocoding results:", JSON.stringify(geoData.map((r: any) => ({
      type: r.type,
      class: r.class,
      lat: r.lat,
      lon: r.lon,
      display_name: r.display_name,
    }))));

    const best = selectBestResult(geoData);
    const customerLat = parseFloat(best.lat);
    const customerLon = parseFloat(best.lon);

    console.log(`Selected: type=${best.type}, class=${best.class}`);
    console.log(`Customer coords: lat=${customerLat}, lon=${customerLon}`);
    console.log(`Restaurant coords: lat=${RESTAURANT_LAT}, lon=${RESTAURANT_LON}`);

    // Warn if result is "road" type but user provided a house number
    if (best.type === "road" && number) {
      console.warn(`WARNING: Geocoding returned "road" but number "${number}" was provided. Distance may be approximate.`);
    }

    // 2. Calculate driving distance
    // LocationIQ Directions API uses lon,lat order
    const dirUrl = `https://us1.locationiq.com/v1/directions/driving/${RESTAURANT_LON},${RESTAURANT_LAT};${customerLon},${customerLat}?key=${API_KEY}&overview=false`;
    console.log("Directions URL:", dirUrl.replace(API_KEY, "***"));

    const dirRes = await fetch(dirUrl);

    if (!dirRes.ok) {
      const errText = await dirRes.text();
      console.error("Directions API error:", dirRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Não foi possível calcular a rota até o endereço informado." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dirData = await dirRes.json();
    const distanceMeters = dirData.routes?.[0]?.distance;

    if (distanceMeters == null) {
      console.error("No route found:", JSON.stringify(dirData));
      return new Response(
        JSON.stringify({ error: "Não foi possível calcular a distância. Verifique o endereço." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const distanceKm = distanceMeters / 1000;
    const roundedKm = Math.round(distanceKm * 2) / 2;
    console.log(`Distance: ${distanceKm.toFixed(2)} km, rounded: ${roundedKm} km`);
    console.log("=== END DEBUG ===");

    return new Response(
      JSON.stringify({
        distanceKm,
        roundedKm,
        geocodeType: best.type || "unknown",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

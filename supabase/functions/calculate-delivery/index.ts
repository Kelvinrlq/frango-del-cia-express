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

  // Sort by type priority (lower = better), fallback to original order
  const sorted = [...results].sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type || ""] ?? 99;
    const pb = TYPE_PRIORITY[b.type || ""] ?? 99;
    return pa - pb;
  });

  console.log("Geocoding results ranked:", sorted.map(r => ({ type: r.type, class: r.class, lat: r.lat, lon: r.lon })));
  return sorted[0];
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

    // Build a complete address string
    const parts = [street, number, neighborhood, city, state || "MS", zipCode, "Brasil"].filter(Boolean);
    const address = parts.join(", ");
    console.log("Geocoding address:", address);

    // 1. Geocode customer address with viewbox + bounded
    const geoParams = new URLSearchParams({
      key: API_KEY,
      q: address,
      format: "json",
      limit: "3",
      countrycodes: "br",
      viewbox: VIEWBOX,
      bounded: "1",
    });

    const geoRes = await fetch(`https://us1.locationiq.com/v1/search?${geoParams}`);

    if (!geoRes.ok) {
      const errText = await geoRes.text();
      console.error("Geocoding API error:", geoRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Não foi possível localizar o endereço. Verifique se está correto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      console.error("Geocoding returned no results for:", address);
      return new Response(
        JSON.stringify({ error: "Endereço não encontrado. Verifique o CEP, rua e número." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const best = selectBestResult(geoData);
    const customerLat = parseFloat(best.lat);
    const customerLon = parseFloat(best.lon);
    console.log(`Selected result: type=${best.type}, lat=${customerLat}, lon=${customerLon}`);

    // 2. Calculate driving distance
    const dirUrl = `https://us1.locationiq.com/v1/directions/driving/${RESTAURANT_LON},${RESTAURANT_LAT};${customerLon},${customerLat}?key=${API_KEY}&overview=false`;
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
      console.error("No route found in directions response:", JSON.stringify(dirData));
      return new Response(
        JSON.stringify({ error: "Não foi possível calcular a distância. Verifique o endereço." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const distanceKm = distanceMeters / 1000;
    const roundedKm = Math.round(distanceKm * 2) / 2;
    console.log(`Distance: ${distanceKm.toFixed(2)} km, rounded: ${roundedKm} km`);

    return new Response(
      JSON.stringify({ distanceKm, roundedKm }),
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Restaurant coordinates (R. Dom Pedro I, 2310, Corumbá - MS)
const RESTAURANT_LAT = -19.0089;
const RESTAURANT_LON = -57.6513;

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

    const { street, number, neighborhood, city } = await req.json();
    if (!street || !number || !city) {
      return new Response(
        JSON.stringify({ error: "Endereço incompleto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const address = `${street}, ${number}, ${neighborhood || ""}, ${city}, MS, Brasil`;

    // 1. Geocode customer address
    const geoUrl = `https://us1.locationiq.com/v1/search?key=${API_KEY}&q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=br`;
    const geoRes = await fetch(geoUrl);
    
    if (!geoRes.ok) {
      const errText = await geoRes.text();
      console.error("Geocoding error:", errText);
      return new Response(
        JSON.stringify({ error: "Não foi possível localizar o endereço" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Endereço não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerLat = parseFloat(geoData[0].lat);
    const customerLon = parseFloat(geoData[0].lon);

    // 2. Calculate driving distance
    const dirUrl = `https://us1.locationiq.com/v1/directions/driving/${RESTAURANT_LON},${RESTAURANT_LAT};${customerLon},${customerLat}?key=${API_KEY}&overview=false`;
    const dirRes = await fetch(dirUrl);

    if (!dirRes.ok) {
      const errText = await dirRes.text();
      console.error("Directions error:", errText);
      return new Response(
        JSON.stringify({ error: "Erro ao calcular rota" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dirData = await dirRes.json();
    const distanceMeters = dirData.routes?.[0]?.distance;

    if (distanceMeters == null) {
      return new Response(
        JSON.stringify({ error: "Não foi possível calcular a distância" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const distanceKm = distanceMeters / 1000;
    const roundedKm = Math.round(distanceKm * 2) / 2;

    return new Response(
      JSON.stringify({ distanceKm, roundedKm }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

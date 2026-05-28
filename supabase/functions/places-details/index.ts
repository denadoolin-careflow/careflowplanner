import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing connector credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { placeId } = await req.json()
    if (!placeId || typeof placeId !== 'string') {
      return new Response(JSON.stringify({ error: 'placeId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(`${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,photos,types',
      },
    })
    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'places api failed', details: data }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let photoUrl: string | null = null
    if (data.photos?.[0]?.name) {
      const photoRes = await fetch(
        `${GATEWAY_URL}/places/v1/${data.photos[0].name}/media?maxWidthPx=800&skipHttpRedirect=true`,
        {
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
          },
        },
      )
      if (photoRes.ok) {
        const photo = await photoRes.json()
        photoUrl = photo.photoUri ?? null
      }
    }

    return new Response(
      JSON.stringify({
        placeId: data.id,
        name: data.displayName?.text ?? '',
        address: data.formattedAddress ?? '',
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        rating: data.rating ?? null,
        photoUrl,
        types: data.types ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
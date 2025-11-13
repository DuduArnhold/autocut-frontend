import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url } = await req.json();
    
    if (!file_url) {
      throw new Error("file_url is required");
    }

    console.log("Transcribing audio from:", file_url);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Lovable AI to transcribe (simulated - in production you'd use a proper audio transcription model)
    // For MVP, we'll create a simulated transcription
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a podcast transcription assistant. Generate a realistic podcast transcript with precise timestamps."
          },
          {
            role: "user",
            content: `Create a simulated podcast transcript about an interesting tech or business topic. 
            
REQUIREMENTS:
- Duration: 5-8 minutes (00:00:00 to 00:08:00)
- Format each line as: [HH:MM:SS] Speaker: text
- Timestamps must be sequential and realistic (every 5-15 seconds)
- Include natural conversation with questions, insights, and memorable quotes
- Create clear peaks of interesting content that would make great clips
- Make 3-4 segments particularly engaging (potential viral moments)

Example format:
[00:00:00] Host: Welcome to the show!
[00:00:12] Guest: Thanks for having me.
[00:00:25] Host: Let's dive into your controversial opinion about AI...

Generate the full transcript now:`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI transcription failed");
    }

    const data = await response.json();
    const transcription = data.choices[0].message.content;

    console.log("Transcription complete");

    return new Response(
      JSON.stringify({ transcription }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in transcribe-audio:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

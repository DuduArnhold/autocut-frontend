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
    const { transcription } = await req.json();
    
    if (!transcription) {
      throw new Error("transcription is required");
    }

    console.log("Analyzing transcript for highlights...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Lovable AI to analyze and find highlights
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
            content: `You are an expert video editor specializing in creating viral social media clips. 
            Analyze transcripts and identify the best moments for 30-90 second clips.
            CRITICAL: Extract timestamps EXACTLY as they appear in the transcript.
            Return ONLY valid JSON array with NO additional text or explanation.`
          },
          {
            role: "user",
            content: `Analyze this podcast transcript and return the top 3 highlight clips for social media.

CRITICAL INSTRUCTIONS:
1. Look for timestamps in format [HH:MM:SS] in the transcript
2. Use ONLY timestamps that ACTUALLY EXIST in the transcript
3. Find the most engaging 30-90 second segments
4. Return ONLY a JSON array, nothing else

Format:
[
  {
    "clip_id": "1",
    "start": "HH:MM:SS",
    "end": "HH:MM:SS",
    "title": "Short catchy title (max 10 words)",
    "context": "One sentence explaining why this moment matters"
  }
]

Rules:
- Extract start timestamps DIRECTLY from the transcript
- Calculate end timestamp by adding 30-90 seconds to start
- Title must match the actual content between start and end timestamps
- Context must accurately describe what is said in that time range
- Return ONLY the JSON array

Transcript:
${transcription}`
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
      
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    let highlightsText = data.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    highlightsText = highlightsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse the JSON
    let highlights;
    try {
      highlights = JSON.parse(highlightsText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", highlightsText);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate the response
    if (!Array.isArray(highlights) || highlights.length === 0) {
      throw new Error("Invalid highlights format from AI");
    }

    console.log("Analysis complete, found", highlights.length, "highlights");

    return new Response(
      JSON.stringify({ highlights }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in analyze-highlights:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    let userInput;
    try {
      userInput = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate messages array
    if (!userInput || !Array.isArray(userInput.messages)) {
      return new Response(
        JSON.stringify({ error: "Request must include a messages array" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = env.OPENAI_API_KEY; // Make sure to name your secret OPENAI_API_KEY in the Cloudflare Workers dashboard
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured in worker" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";

    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_tokens: 300,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Error contacting OpenAI",
          details: String(err),
        }),
        { status: 502, headers: corsHeaders }
      );
    }
  },
};

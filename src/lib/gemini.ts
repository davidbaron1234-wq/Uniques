export async function identifyItemWithGemini(base64Image: string) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      console.error("Server Error:", response.statusText);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Client Bridge Error:", error);
    return null;
  }
}
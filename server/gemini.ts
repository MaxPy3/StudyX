import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("[Gemini API] API Key available:", !!process.env.GEMINI_API_KEY);

// Funzione di test per verificare quale modello Gemini è disponibile
async function testGeminiAPI() {
  try {
    console.log("[Gemini API] Testing API connection...");
    const testGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Prova diversi modelli disponibili
    const modelNames = ["gemini-pro", "gemini-1.5-pro", "gemini-1.0-pro"];
    let workingModel = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`[Gemini API] Testing model: ${modelName}`);
        const testModel = testGenAI.getGenerativeModel({ model: modelName });
        
        const result = await testModel.generateContent("Hello, please respond with the word 'working' to confirm the API is functioning.");
        const response = await result.response;
        const text = response.text();
        
        console.log(`[Gemini API] Model ${modelName} response:`, text);
        workingModel = modelName;
        break;
      } catch (error) {
        const modelError = error as Error;
        console.log(`[Gemini API] Model ${modelName} not available:`, modelError.message);
      }
    }
    
    if (workingModel) {
      console.log(`[Gemini API] Found working model: ${workingModel}`);
      return { success: true, model: workingModel };
    } else {
      console.error("[Gemini API] No working models found");
      return { success: false, model: null };
    }
  } catch (error) {
    console.error("[Gemini API] API test failed:", error);
    return { success: false, model: null };
  }
}

// Esegui il test all'avvio del server e usa il modello funzionante
let MODEL_NAME = "gemini-1.5-pro"; // Default, sarà aggiornato se un altro modello funziona

testGeminiAPI().then(result => {
  console.log("[Gemini API] API test result:", result.success ? "Success" : "Failed");
  if (result.success && result.model) {
    MODEL_NAME = result.model;
    console.log(`[Gemini API] Using model: ${MODEL_NAME}`);
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

export async function generateStudyContent(prompt: string) {
  try {
    console.log("[Gemini API] Generating content for prompt:", prompt);
    
    const result = await model.generateContent(
      `Genera una spiegazione didattica su: ${prompt}

      Scrivi una spiegazione narrativa e scorrevole che:
      - Inizi con un'introduzione generale dell'argomento
      - Sviluppi i concetti in modo logico e progressivo
      - Includa dettagli storici ed esempi pertinenti
      - Usi un linguaggio chiaro e didattico
      - Termini con una breve conclusione

      Scrivi come un testo continuo, senza formattazioni o titoli di sezione.
      Non includere JSON o altri formati strutturati.`
    );

    const response = await result.response;
    const text = response.text();
    
    console.log("[Gemini API] Content generation successful, text length:", text.length);
    
    return {
      title: prompt,
      content: text
    };
  } catch (error) {
    console.error("[Gemini API] Error in generateStudyContent:", error);
    throw error;
  }
}

export async function generateQuiz(topic: string) {
  try {
    console.log("[Gemini API] Generating quiz for topic:", topic);
    
    const result = await model.generateContent(
      `Genera 5 domande a risposta multipla su: ${topic}

      Per ogni domanda fornisci:
      - Il testo della domanda
      - 4 opzioni di risposta
      - L'indice della risposta corretta (0-3)

      La risposta deve essere un array di oggetti con questa struttura:
      [
        {
          "question": "Testo della domanda",
          "options": ["opzione 1", "opzione 2", "opzione 3", "opzione 4"],
          "correctAnswer": 0
        }
      ]

      IMPORTANTE: Restituisci solo JSON valido puro, senza delimitatori di markdown.`
    );

    const response = await result.response;
    const responseText = response.text();
    console.log("[Gemini API] Quiz raw response:", responseText.substring(0, 100) + "...");
    
    try {
      // Pulisci il testo rimuovendo delimitatori di markdown
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      console.log("[Gemini API] Quiz cleaned text:", cleanText.substring(0, 100) + "...");
      
      const parsed = JSON.parse(cleanText);
      console.log("[Gemini API] Quiz parsing successful, items:", Array.isArray(parsed) ? parsed.length : 0);
      return parsed;
    } catch (e) {
      console.error("[Gemini API] Error parsing quiz JSON:", e);
      
      // Fallback: prova a trovare e estrarre il JSON dai delimitatori
      try {
        const jsonStartIndex = responseText.indexOf('[');
        const jsonEndIndex = responseText.lastIndexOf(']') + 1;
        
        if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
          const jsonPart = responseText.substring(jsonStartIndex, jsonEndIndex);
          console.log("[Gemini API] Extracted JSON part:", jsonPart.substring(0, 100) + "...");
          
          const fallbackParsed = JSON.parse(jsonPart);
          console.log("[Gemini API] Fallback parsing successful, items:", Array.isArray(fallbackParsed) ? fallbackParsed.length : 0);
          return fallbackParsed;
        }
      } catch (fallbackError) {
        console.error("[Gemini API] Fallback parsing failed:", fallbackError);
      }
      
      return [];
    }
  } catch (error) {
    console.error("[Gemini API] Error in generateQuiz:", error);
    return [];
  }
}

export async function generateConceptMap(topic: string) {
  try {
    console.log("[Gemini API] Generating concept map for topic:", topic);
    
    const result = await model.generateContent(
      `Crea una mappa concettuale per: ${topic}
      
      Genera un oggetto JSON con questa struttura precisa, senza markdown o altro testo:
      {
        "nodes": [
          {"id": "main", "label": "${topic}"},
          {"id": "node1", "label": "Concetto 1"},
          {"id": "node2", "label": "Concetto 2"}
        ],
        "links": [
          {"source": "main", "target": "node1", "label": "è collegato a"},
          {"source": "main", "target": "node2", "label": "include"}
        ]
      }`
    );

    const response = await result.response;
    const responseText = response.text();
    console.log("[Gemini API] Concept map raw response:", responseText.substring(0, 100) + "...");
    
    try {
      const text = responseText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(text);
      console.log("[Gemini API] Concept map parsing successful, nodes:", data.nodes.length);
      return data;
    } catch (e) {
      console.error("[Gemini API] Error parsing concept map JSON:", e);
      return {
        nodes: [{ id: "main", label: topic }],
        links: []
      };
    }
  } catch (error) {
    console.error("[Gemini API] Error in generateConceptMap:", error);
    return {
      nodes: [{ id: "main", label: topic }],
      links: []
    };
  }
}

export async function searchStudyContent(query: string) {
  try {
    console.log("[Gemini API] Searching for content with query:", query);
    const result = await generateStudyContent(query);
    console.log("[Gemini API] Successfully generated content for query:", query);
    return result;
  } catch (error) {
    console.error("[Gemini API] Error in searchStudyContent:", error);
    throw error;
  }
}

export async function checkFactAccuracy(text: string) {
  const result = await model.generateContent(
    `Analizza questa affermazione e determina se contiene informazioni storicamente false o imprecise:
    "${text}"
    
    Rispondi solo con true se l'affermazione contiene errori storici, false altrimenti.`
  );
  
  const response = await result.response;
  return response.text().toLowerCase().includes('true');
}
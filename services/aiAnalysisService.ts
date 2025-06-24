
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { FootballMatch, MatchAnalysis } from '../types';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("Gemini API Key (GEMINI_API_KEY) is not defined in environment variables. AI analysis will be disabled.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export const getMatchAnalysisFromAI = async (
  match: FootballMatch
): Promise<MatchAnalysis | null> => {
  if (!ai) {
    console.error("AI Service not initialized. Check API Key.");
    throw new Error("AI Service is not available. Please check configuration.");
  }
  if (!match) {
    throw new Error("Match details are required for AI analysis.");
  }

  const prompt = `
    Phân tích trận đấu bóng đá sắp tới và cung cấp thông tin chi tiết.
    Chi tiết trận đấu:
    - Đội nhà: ${match.homeTeam}
    - Đội khách: ${match.awayTeam}
    - Giải đấu: ${match.league}
    - Thời gian bắt đầu: ${new Date(match.startTime).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam)

    Vui lòng cung cấp phân tích của bạn dưới dạng đối tượng JSON hợp lệ với cấu trúc sau:
    {
      "predictedWinner": "home | away | draw | uncertain",
      "predictionReasoning": " (Bằng tiếng Việt) Giải thích ngắn gọn cho dự đoán của bạn.",
      "homeTeamForm": " (Bằng tiếng Việt) Phong độ gần đây của đội nhà (ví dụ: Thắng Thắng Hòa Thua Thắng hoặc một câu ngắn).",
      "awayTeamForm": " (Bằng tiếng Việt) Phong độ gần đây của đội khách (ví dụ: Thua Thua Thắng Hòa Thua hoặc một câu ngắn).",
      "keyFactors": [" (Bằng tiếng Việt) Yếu tố 1", " (Bằng tiếng Việt) Yếu tố 2", "ví dụ: Chấn thương cầu thủ chủ chốt của Đội Nhà", "ví dụ: Thành tích sân khách tốt của Đội Khách"],
      "confidence": {
        "homeWinPercentage": <number_0_to_100_or_null_if_uncertain>,
        "awayWinPercentage": <number_0_to_100_or_null_if_uncertain>,
        "drawPercentage": <number_0_to_100_or_null_if_uncertain>
      },
      "summary": " (Bằng tiếng Việt) Một bản tóm tắt tổng thể rất ngắn gọn về dự đoán trận đấu và những thông tin chi tiết chính."
    }

    Tập trung vào phân tích khách quan dựa trên các yếu tố bóng đá điển hình. Tránh bịa đặt thông tin nếu không được biết đến rộng rãi.
    Nếu bạn rất không chắc chắn về một dự đoán, hãy sử dụng "uncertain" cho predictedWinner và cung cấp giá trị null cho các tỷ lệ phần trăm.
    Đảm bảo kết quả đầu ra là một đối tượng JSON hợp lệ.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{text: prompt}] }],
      config: {
        responseMimeType: "application/json",
      },
    });
    
    let jsonText = response.text.trim();
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchFence = jsonText.match(fenceRegex);
    if (matchFence && matchFence[2]) {
      jsonText = matchFence[2].trim();
    }

    try {
      const analysisResult = JSON.parse(jsonText) as MatchAnalysis;
      if (!analysisResult.predictedWinner) {
        console.error("Parsed AI analysis is missing 'predictedWinner'", analysisResult);
        throw new Error("Phản hồi phân tích AI thiếu các trường quan trọng.");
      }
      return analysisResult;
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI:", parseError, "Raw text:", jsonText);
      throw new Error("AI trả về định dạng phân tích không hợp lệ.");
    }

  } catch (error) {
    console.error("Error fetching match analysis from AI:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("Khóa API của AI không hợp lệ. Vui lòng kiểm tra cấu hình của bạn.");
    }
    throw new Error(`Không thể lấy phân tích trận đấu từ AI. ${error instanceof Error ? error.message : String(error)}`);
  }
};
    
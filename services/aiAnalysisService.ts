import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { FootballMatch, MatchAnalysis, TournamentTeam, TournamentPlayer, TeamAnalysis, TournamentMatchAnalysis } from '../types';

// Read API keys from environment variables defined at build time.
const PRIMARY_API_KEY = process.env.API_KEY;
const SECONDARY_API_KEY = process.env.API_KEY_2;

// Initialize AI clients. They will be null if the key is not provided.
const ai1 = PRIMARY_API_KEY ? new GoogleGenAI({ apiKey: PRIMARY_API_KEY }) : null;
const ai2 = SECONDARY_API_KEY ? new GoogleGenAI({ apiKey: SECONDARY_API_KEY }) : null;

if (!ai1) {
  console.warn("Primary AI API Key (GEMINI_API_KEY) is not defined.");
}
if (!ai2) {
  console.warn("Secondary AI API Key (GEMINI_API_KEY_2) is not defined. Fallback key will not be available.");
}

const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

// Checks for errors that warrant a fallback (quota exhausted or invalid key)
const isRecoverableError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const msg = error.message;
    return msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("API key not valid");
};

/**
 * Attempts analysis with a specific client, trying the primary model then the fallback model.
 */
const performAnalysisWithClient = async (
    aiClient: GoogleGenAI,
    clientName: string,
    contents: any,
    config: any
): Promise<GenerateContentResponse> => {
    try {
        return await aiClient.models.generateContent({ model: PRIMARY_MODEL, contents, config });
    } catch (primaryError) {
        // Fallback to the lite model only on recoverable errors.
        if (isRecoverableError(primaryError)) {
            console.warn(`[${clientName}] '${PRIMARY_MODEL}' failed. Trying fallback '${FALLBACK_MODEL}'.`);
            try {
                return await aiClient.models.generateContent({ model: FALLBACK_MODEL, contents, config });
            } catch (fallbackError) {
                console.error(`[${clientName}] Fallback model '${FALLBACK_MODEL}' also failed.`, fallbackError);
                throw fallbackError; // Re-throw error from the fallback model
            }
        }
        // For non-recoverable errors on the primary model, fail fast.
        throw primaryError;
    }
};

/**
 * Orchestrates the full analysis process, using the primary key (with model fallback)
 * and then the secondary key (with model fallback) if the first fails.
 */
const generateContentOrchestrator = async (
    contents: any,
    config: any
): Promise<GenerateContentResponse> => {
    if (ai1) {
        try {
            return await performAnalysisWithClient(ai1, 'Primary Client', contents, config);
        } catch (primaryError) {
            // If the primary client fails with a recoverable error, try the secondary client.
            if (isRecoverableError(primaryError) && ai2) {
                console.warn(`Primary client failed with a recoverable error. Switching to secondary client.`);
                try {
                    return await performAnalysisWithClient(ai2, 'Secondary Client', contents, config);
                } catch (secondaryError) {
                     // If the secondary client also fails, throw a final, user-friendly error.
                     throw new Error("Cả hai khóa API chính và phụ đều không thành công. Vui lòng kiểm tra lại hạn ngạch và cấu hình khóa API.");
                }
            }
            // Re-throw if the error was not recoverable or if there's no secondary client.
            throw primaryError; 
        }
    } else if (ai2) {
        // If no primary client, use the secondary one directly.
        console.warn("Primary client not configured. Using secondary client.");
        return await performAnalysisWithClient(ai2, 'Secondary Client', contents, config);
    } else {
        // If no clients are available at all.
        throw new Error("Dịch vụ AI chưa được khởi tạo vì không có khóa API nào được cấu hình.");
    }
};


export const getMatchAnalysisFromAI = async (
  match: FootballMatch
): Promise<MatchAnalysis | null> => {
  if (!ai1 && !ai2) {
    throw new Error("Dịch vụ AI không khả dụng. Vui lòng kiểm tra cấu hình.");
  }
  if (!match) {
    throw new Error("Match details are required for AI analysis.");
  }

  const prompt = `
    Hãy tìm thông tin trên internet, Phân tích trận đấu bóng đá dưới đây và cung cấp thông tin chi tiết.
    Chi tiết trận đấu:
    - Đội nhà: ${match.homeTeam}
    - Đội khách: ${match.awayTeam}
    - Giải đấu: ${match.league}
    - Thời gian bắt đầu: ${new Date(match.startTime).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam)

    Vui lòng cung cấp thông tin tìm được và phân tích của bạn dưới dạng đối tượng JSON hợp lệ với cấu trúc sau:
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

    Tập trung vào phân tích chủ quan dựa trên các yếu tố bóng đá điển hình. Bịa đặt thông tin vui vẻ cũng được nếu không có dữ liệu.
    Hãy tự do đưa ra ý kiến của bạn về trận đấu.
    Phong cách diễn đạt tự nhiên, súc tích, vui vẻ hài hước, thân mật như bạn thân, tục tĩu cũng được.
    Đảm bảo kết quả đầu ra là một đối tượng JSON hợp lệ.
  `;

  try {
    const response: GenerateContentResponse = await generateContentOrchestrator(
        [{ role: "user", parts: [{text: prompt}] }],
        { responseMimeType: "application/json" }
    );
    
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
    throw new Error(`Không thể lấy phân tích trận đấu từ AI. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getTeamAnalysisFromAI = async (
  team: TournamentTeam,
  players: TournamentPlayer[]
): Promise<TeamAnalysis | null> => {
  if (!ai1 && !ai2) {
    throw new Error("Dịch vụ AI không khả dụng.");
  }

  const playerDetails = players
    .map(p => {
        let detail = `- ${p.name} (#${p.jerseyNumber}), Skills: Speed(${p.skills?.speed}), Shooting(${p.skills?.shooting}), Passing(${p.skills?.passing}), Dribbling(${p.skills?.dribbling}), Defending(${p.skills?.defending}), Physical(${p.skills?.physical})`;
        if (p.bio && p.bio.trim()) {
            detail += `, Bio: ${p.bio.trim()}`;
        }
        return detail;
    })
    .join('\n');

  const prompt = `
    Phân tích chi tiết đội bóng "${team.name}" dựa trên danh sách cầu thủ, chỉ số kỹ năng, và ghi chú tiểu sử của họ.
    Hãy đóng vai một chuyên gia phân tích bóng đá chuyên nghiệp nhưng có giọng văn hài hước, vui vẻ và lôi cuốn.

    Danh sách cầu thủ (bao gồm kỹ năng và tiểu sử nếu có):
    ${playerDetails}

    Dựa vào tất cả thông tin trên, hãy cung cấp một bài phân tích sâu sắc bao gồm các điểm mạnh, điểm yếu, các cầu thủ chủ chốt (dựa vào cả chỉ số và tiểu sử), lối chơi chiến thuật, và một dự đoán vui vẻ về khả năng của đội trong giải đấu.

    Vui lòng trả về kết quả dưới dạng một đối tượng JSON hợp lệ với cấu trúc sau:
    {
      "strengths": ["string"],
      "weaknesses": ["string"],
      "keyPlayers": [{ "name": "string", "reason": "string" }],
      "tacticalStyle": "string",
      "funnyPrediction": "string",
      "summary": "string"
    }

    Nội dung phải bằng tiếng Việt.
    Đảm bảo rằng đầu ra chỉ là một đối tượng JSON hợp lệ, không có bất kỳ văn bản hay markdown nào khác bao quanh.
  `;

  try {
    const response: GenerateContentResponse = await generateContentOrchestrator(
        [{ role: "user", parts: [{ text: prompt }] }],
        { responseMimeType: "application/json" }
    );

    const jsonText = response.text.trim();
    
    try {
      const analysisResult = JSON.parse(jsonText) as TeamAnalysis;
      return analysisResult;
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI for team analysis:", parseError, "Raw text:", jsonText);
      throw new Error("AI returned an invalid analysis format for the team.");
    }

  } catch (error) {
    console.error("Error fetching team analysis from AI:", error);
    throw new Error(`Could not retrieve team analysis from AI. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getTournamentMatchAnalysisFromAI = async (
  homeTeam: TournamentTeam,
  awayTeam: TournamentTeam,
  homePlayers: TournamentPlayer[],
  awayPlayers: TournamentPlayer[]
): Promise<TournamentMatchAnalysis | null> => {
  if (!ai1 && !ai2) {
    throw new Error("Dịch vụ AI không khả dụng.");
  }

  const formatPlayerList = (players: TournamentPlayer[]) => {
    if (players.length === 0) return "Không có thông tin cầu thủ.";
    return players
      .map(p => `- ${p.name} (#${p.jerseyNumber}), Kỹ năng: Tốc độ(${p.skills?.speed}), Sút(${p.skills?.shooting}), Chuyền(${p.skills?.passing}), Rê bóng(${p.skills?.dribbling}), Phòng ngự(${p.skills?.defending}), Thể chất(${p.skills?.physical})`)
      .join('\n');
  };

  const prompt = `
    Hãy đóng vai một bình luận viên bóng đá chuyên nghiệp, hài hước và sâu sắc. Phân tích chi tiết trận đấu sắp tới giữa hai đội trong giải đấu nội bộ.

    Thông tin hai đội:
    - Đội nhà: ${homeTeam.name}
      Đội hình:
      ${formatPlayerList(homePlayers)}

    - Đội khách: ${awayTeam.name}
      Đội hình:
      ${formatPlayerList(awayPlayers)}

    Dựa trên toàn bộ dữ liệu về đội hình và chỉ số kỹ năng của cầu thủ, hãy đưa ra một bài phân tích toàn diện. Vui lòng trả về kết quả dưới dạng một đối tượng JSON hợp lệ và CHỈ JSON, không có markdown hay bất kỳ văn bản nào khác.

    Cấu trúc JSON yêu cầu:
    {
      "predictedWinner": "home | away | draw",
      "predictedScore": "string (ví dụ: '2-1')",
      "winProbability": { "home": number, "away": number, "draw": number },
      "matchSummary": "string (Tóm tắt ngắn gọn, kịch tính về trận đấu sẽ diễn ra như thế nào)",
      "keyMatchups": [{ "player1": "string", "player2": "string", "description": "string (Mô tả cuộc đối đầu tay đôi đáng chú ý)" }],
      "homeTeamAnalysis": { "strengths": ["string"], "weaknesses": ["string"], "suggestedTactics": "string (Chiến thuật đề xuất cho đội nhà)" },
      "awayTeamAnalysis": { "strengths": ["string"], "weaknesses": ["string"], "suggestedTactics": "string (Chiến thuật đề xuất cho đội khách)" },
      "funnyCommentary": "string (Một câu bình luận hài hước, cà khịa hoặc dự đoán bá đạo về trận đấu)"
    }

    Lưu ý:
    - Toàn bộ nội dung phải bằng tiếng Việt.
    - Phân tích cần logic, dựa trên sự kết hợp các chỉ số của cầu thủ để đánh giá sức mạnh tổng thể. Ví dụ: đội có nhiều cầu thủ phòng ngự tốt sẽ có hàng thủ chắc chắn.
    - Tỷ lệ thắng (winProbability) của 3 cửa cộng lại phải bằng 100.
  `;

  try {
    const response: GenerateContentResponse = await generateContentOrchestrator(
        [{ role: "user", parts: [{ text: prompt }] }],
        { responseMimeType: "application/json" }
    );

    const jsonText = response.text.trim();
    
    try {
      const analysisResult = JSON.parse(jsonText) as TournamentMatchAnalysis;
      return analysisResult;
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI for match analysis:", parseError, "Raw text:", jsonText);
      throw new Error("AI returned an invalid analysis format for the match.");
    }

  } catch (error) {
    console.error("Error fetching match analysis from AI:", error);
    throw new Error(`Could not retrieve match analysis from AI. ${error instanceof Error ? error.message : String(error)}`);
  }
};
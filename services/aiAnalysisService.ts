import { FootballMatch, MatchAnalysis, TournamentTeam, TournamentPlayer, TeamAnalysis, TournamentMatchAnalysis } from '../types';

// Read API keys from environment variables defined at build time.
const PRIMARY_API_KEY = process.env.API_KEY;
const SECONDARY_API_KEY = process.env.API_KEY_2;

if (!PRIMARY_API_KEY) {
  console.warn("Primary AI API Key (QWEN_API_KEY) is not defined.");
}
if (!SECONDARY_API_KEY) {
  console.warn("Secondary AI API Key (QWEN_API_KEY_2) is not defined. Fallback key will not be available.");
}

// Qwen Cloud (Alibaba DashScope), OpenAI-compatible mode.
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = 'qwen3.6-flash';

// Checks for errors that warrant switching to the other API key (quota exhausted or invalid key).
const isRecoverableError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const msg = error.message;
    return msg.includes('429') || msg.includes('quota') || msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('Unauthorized');
};

/**
 * Calls the Qwen Cloud chat completions endpoint with a given API key and returns the raw text content.
 */
const callQwenChatCompletion = async (apiKey: string, clientName: string, prompt: string): Promise<string> => {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: QWEN_MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`[${clientName}] Qwen request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error(`[${clientName}] Qwen response did not contain any content.`);
    }
    return content;
};

/**
 * Orchestrates the analysis request, using the primary key and then the secondary key
 * (if configured) when the primary attempt fails with a recoverable error.
 */
const generateContentOrchestrator = async (prompt: string): Promise<string> => {
    if (PRIMARY_API_KEY) {
        try {
            return await callQwenChatCompletion(PRIMARY_API_KEY, 'Primary Client', prompt);
        } catch (primaryError) {
            if (isRecoverableError(primaryError) && SECONDARY_API_KEY) {
                console.warn('Primary client failed with a recoverable error. Switching to secondary client.');
                try {
                    return await callQwenChatCompletion(SECONDARY_API_KEY, 'Secondary Client', prompt);
                } catch (secondaryError) {
                    throw new Error("Cả hai khóa API chính và phụ đều không thành công. Vui lòng kiểm tra lại hạn ngạch và cấu hình khóa API.");
                }
            }
            throw primaryError;
        }
    } else if (SECONDARY_API_KEY) {
        console.warn('Primary client not configured. Using secondary client.');
        return await callQwenChatCompletion(SECONDARY_API_KEY, 'Secondary Client', prompt);
    } else {
        throw new Error("Dịch vụ AI chưa được khởi tạo vì không có khóa API nào được cấu hình.");
    }
};

const parseJsonResponse = <T>(rawText: string): T => {
    let jsonText = rawText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchFence = jsonText.match(fenceRegex);
    if (matchFence && matchFence[2]) {
        jsonText = matchFence[2].trim();
    }
    return JSON.parse(jsonText) as T;
};

export const getMatchAnalysisFromAI = async (
  match: FootballMatch
): Promise<MatchAnalysis | null> => {
  if (!PRIMARY_API_KEY && !SECONDARY_API_KEY) {
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
    const rawText = await generateContentOrchestrator(prompt);

    try {
      const analysisResult = parseJsonResponse<MatchAnalysis>(rawText);
      if (!analysisResult.predictedWinner) {
        console.error("Parsed AI analysis is missing 'predictedWinner'", analysisResult);
        throw new Error("Phản hồi phân tích AI thiếu các trường quan trọng.");
      }
      return analysisResult;
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI:", parseError, "Raw text:", rawText);
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
  if (!PRIMARY_API_KEY && !SECONDARY_API_KEY) {
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
    const rawText = await generateContentOrchestrator(prompt);

    try {
      return parseJsonResponse<TeamAnalysis>(rawText);
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI for team analysis:", parseError, "Raw text:", rawText);
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
  if (!PRIMARY_API_KEY && !SECONDARY_API_KEY) {
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
    const rawText = await generateContentOrchestrator(prompt);

    try {
      return parseJsonResponse<TournamentMatchAnalysis>(rawText);
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI for match analysis:", parseError, "Raw text:", rawText);
      throw new Error("AI returned an invalid analysis format for the match.");
    }

  } catch (error) {
    console.error("Error fetching match analysis from AI:", error);
    throw new Error(`Could not retrieve match analysis from AI. ${error instanceof Error ? error.message : String(error)}`);
  }
};

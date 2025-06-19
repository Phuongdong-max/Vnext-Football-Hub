"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchResultTeam = exports.BetTeamSelection = exports.BettingRoundStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MEMBER"] = "member";
})(UserRole || (exports.UserRole = UserRole = {}));
var BettingRoundStatus;
(function (BettingRoundStatus) {
    BettingRoundStatus["OPEN"] = "open";
    BettingRoundStatus["CLOSED"] = "closed";
    BettingRoundStatus["CANCELLED"] = "cancelled";
    BettingRoundStatus["RESULT_UPDATED"] = "result_updated";
})(BettingRoundStatus || (exports.BettingRoundStatus = BettingRoundStatus = {}));
var BetTeamSelection;
(function (BetTeamSelection) {
    BetTeamSelection["HOME"] = "home";
    BetTeamSelection["AWAY"] = "away";
})(BetTeamSelection || (exports.BetTeamSelection = BetTeamSelection = {}));
var MatchResultTeam;
(function (MatchResultTeam) {
    MatchResultTeam["HOME_WIN"] = "home";
    MatchResultTeam["AWAY_WIN"] = "away";
    MatchResultTeam["DRAW"] = "draw";
})(MatchResultTeam || (exports.MatchResultTeam = MatchResultTeam = {}));
//# sourceMappingURL=types.js.map
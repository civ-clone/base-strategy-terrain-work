"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrainWork = void 0;
// Generic: a worker improves the terrain around the player's cities (civ-clone/web-renderer#234): it takes a terrain
//  job, or carries on with one, when it has no city site to settle and none it can reach, or when the player wants
//  more workers on terrain jobs than it has, by the ruleset's `TerrainPolicy` (`lib/Unit/terrainWork`). Otherwise it
//  drops any job it has. Handles the action only when the worker has a job to get on with; otherwise the next strategy
//  (`simple-ai-client`'s `WorkerTurn`) carries on as usual.
//
// For one worker of a human player's ("automate Settlers", civ-clone/web-renderer#200), `order` does the next sensible
//  terrain job as a standing order (`UnitOrder`): it never settles, and walks there peacefully (`followPath`).
const terrainWork_1 = require("../../lib/Unit/terrainWork");
const AIStrategy_1 = require("@civ-clone/base-strategy-ai/Strategies/lib/AIStrategy");
const Worker_1 = require("@civ-clone/base-unit-type-worker/Worker");
const enemyAdjacent_1 = require("@civ-clone/base-strategy-ai/lib/Unit/enemyAdjacent");
const followPath_1 = require("@civ-clone/base-strategy-ai/lib/Unit/followPath");
const actionLookup_1 = require("@civ-clone/base-strategy-ai/lib/actionLookup");
const reachable_1 = require("@civ-clone/base-strategy-ai/lib/Unit/reachable");
const unitTurnContextFor_1 = require("@civ-clone/base-strategy-ai/Strategies/lib/unitTurnContextFor");
class TerrainWork extends AIStrategy_1.default {
    constructor(dependencies, knowledge, policy, travel) {
        super(dependencies, knowledge);
        this._policy = policy;
        this._travel = travel;
    }
    handles(action) {
        return action.value() instanceof Worker_1.default;
    }
    async attempt(action) {
        const player = action.player(), unit = action.value(), memory = this.memoryFor(player), jobs = (0, terrainWork_1.terrainJobs)(memory), { actions, target, tile } = (0, unitTurnContextFor_1.default)(this.dependencies(), action);
        // A worker settles rather than improves terrain if it can: it's on its way to a city site or standing on one, or
        //  there's a site it can reach and the player has the terrain workers it wants without it. Asked of every worker
        //  this is offered to: one at work is busy, and isn't offered.
        const others = [...jobs.keys()].filter((other) => other !== unit).length;
        if (target ||
            (actions.foundCity &&
                this.knowledge().shouldBuildCity(this.dependencies(), player, tile)) ||
            (others >= this._policy.workersWanted(this.dependencies(), player) &&
                this.siteInReach(unit, tile, memory.targets.goodSitesForCities))) {
            (0, terrainWork_1.dropTerrainJob)(memory, unit);
            return false;
        }
        return (0, terrainWork_1.default)(this.dependencies(), player, memory, this._policy, unit, actions, () => this._travel(this.dependencies(), player, memory, this.knowledge(), unit));
    }
    // The next terrain job for the unit, as a standing order: never settling, and handing the unit back (`false`) when
    //  there's no job it can do or another player's unit is near.
    order(action) {
        const dependencies = this.dependencies(), player = action.player(), unit = action.value(), memory = this.memoryFor(player);
        if ((0, enemyAdjacent_1.default)(dependencies, player, unit)) {
            return false;
        }
        const plan = (0, terrainWork_1.planTerrainJob)(dependencies, player, memory, this._policy, unit, (0, actionLookup_1.lookupActions)(unit.actions()));
        if (typeof plan === 'boolean') {
            return plan;
        }
        if ((0, followPath_1.default)(dependencies, player, memory, this.knowledge(), unit) ===
            'threatened') {
            return false;
        }
        (0, terrainWork_1.finishTerrainJob)(dependencies, unit, plan);
        return true;
    }
    siteInReach(unit, tile, sites) {
        if (!sites.some((site) => site !== tile)) {
            return false;
        }
        const reachable = (0, reachable_1.default)(unit);
        return sites.some((site) => site !== tile && (reachable === null || reachable.has(site)));
    }
}
exports.TerrainWork = TerrainWork;
exports.default = TerrainWork;
//# sourceMappingURL=TerrainWork.js.map
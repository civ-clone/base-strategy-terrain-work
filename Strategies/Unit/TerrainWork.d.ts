import { TerrainPolicy } from '../../lib/Unit/terrainWork';
import AIStrategy from '@civ-clone/base-strategy-ai/Strategies/lib/AIStrategy';
import Dependencies from '@civ-clone/base-strategy-ai/lib/Dependencies';
import Knowledge from '@civ-clone/base-strategy-ai/lib/Knowledge';
import Memory from '@civ-clone/base-strategy-ai/lib/Memory';
import { OrderStrategy } from '@civ-clone/base-strategy-ai/Strategies/lib/OrderStrategy';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import Unit from '@civ-clone/core-unit/Unit';
import UnitOrder from '@civ-clone/base-strategy-ai/PlayerActions/UnitOrder';
export type TerrainWorkTravel = (
  dependencies: Dependencies,
  player: Player,
  memory: Memory,
  knowledge: Knowledge,
  unit: Unit
) => Promise<void>;
export declare class TerrainWork extends AIStrategy implements OrderStrategy {
  private _policy;
  private _travel;
  constructor(
    dependencies: Dependencies,
    knowledge: Knowledge,
    policy: TerrainPolicy,
    travel: TerrainWorkTravel
  );
  handles(action: PlayerAction): boolean;
  attempt(action: PlayerAction<Unit>): Promise<boolean>;
  order(action: UnitOrder): boolean;
  private siteInReach;
}
export default TerrainWork;

// The unit-class check `TerrainWork.handles` made before it asked the unit's traits, kept as a literal fixture: it must
//  give the same answer for every Civ1 unit type (civ-clone/web-renderer#1008).
import * as Units from '@civ-clone/civ1-unit/Units';
import testGame, { knowledge } from './lib/testGame';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import TerrainWork from '../Strategies/Unit/TerrainWork';
import Unit from '@civ-clone/core-unit/Unit';
import Worker from '@civ-clone/base-unit-type-worker/Worker';
import { expect } from 'chai';

describe('TerrainWork and unit traits', (): void => {
  it('should handle the same Civ1 units as `Worker` did, and nothing that is not a unit', async (): Promise<void> => {
    const { addPlayer, addUnit, dependencies } = await testGame('9G', 3, 3),
      player = addPlayer(),
      terrainWork = new TerrainWork(
        dependencies,
        knowledge,
        { jobs: () => [], workersWanted: () => 0 },
        (): Promise<void> => Promise.resolve()
      ),
      UnitTypes = Object.values(Units) as (new (...args: any[]) => Unit)[],
      handled = UnitTypes.filter((UnitType): boolean => {
        const unit = addUnit(UnitType, player, 1, 1),
          handles = terrainWork.handles(new PlayerAction(player, unit));

        expect(handles, UnitType.name).to.equal(unit instanceof Worker);

        return handles;
      });

    expect(UnitTypes.length).to.equal(28);
    // Neither always nor never: Settlers only.
    expect(handled).to.eql([Units.Settlers]);
    expect(terrainWork.handles(new PlayerAction(player, player))).false;
  });
});

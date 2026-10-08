import { Settlers, Warrior } from '@civ-clone/civ1-unit/Units';
import { TerrainPolicy, terrainJobs } from '../lib/Unit/terrainWork';
import testGame, { TestGame, knowledge } from './lib/testGame';
import City from '@civ-clone/core-city/City';
import Effect from '@civ-clone/core-rule/Effect';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import TerrainWork from '../Strategies/Unit/TerrainWork';
import Tiles from '@civ-clone/core-city/Rules/Tiles';
import Tile from '@civ-clone/core-world/Tile';
import UnitOrder from '@civ-clone/base-strategy-ai/PlayerActions/UnitOrder';
import { expect } from 'chai';
import { instance as memoryRegistryInstance } from '@civ-clone/base-strategy-ai/lib/MemoryRegistry';

const at = (tile: Tile): string => `${tile.x()},${tile.y()}`;

// A road wanted on `x`, `y` alone.
const roadOn = (x: number, y: number): TerrainPolicy => ({
  jobs: (dependencies, player, tile) =>
    tile.x() === x && tile.y() === y
      ? [{ improvement: 'road', value: 10, turns: 2 }]
      : [],
  workersWanted: () => 0,
});

const setUp = async (): Promise<
  TestGame & { player: Player; settlers: Settlers }
> => {
  const setup = await testGame('49G', 7, 7),
    player = setup.addPlayer();

  // A city's tiles are the ruleset's: here, everything within two tiles.
  setup.game.rules.register(
    new Tiles(new Effect((city: City) => city.tile().getSurroundingArea(2)))
  );

  const city = new City(
    player,
    setup.world.get(3, 3),
    'City',
    setup.game.rules,
    setup.game.workedTiles
  );

  setup.game.cities.register(city);

  return {
    ...setup,
    player,
    settlers: setup.addUnit(Settlers, player, 1, 3),
  };
};

describe('TerrainWork', (): void => {
  it('should walk a worker to its job as a standing order, without settling', async (): Promise<void> => {
    const { dependencies, player, settlers } = await setUp(),
      terrainWork = new TerrainWork(
        dependencies,
        { ...knowledge, shouldBuildCity: (): boolean => true },
        roadOn(3, 1),
        (): Promise<void> => {
          throw new Error('An order walks the unit itself.');
        }
      );

    expect(terrainWork.order(new UnitOrder(player, settlers))).true;
    expect(at(settlers.tile())).to.equal('2,2');
    expect(
      at(
        terrainJobs(memoryRegistryInstance.memoryFor(player)).get(settlers)!
          .tile
      )
    ).to.equal('3,1');
  });

  it('should start the job on its tile', async (): Promise<void> => {
    const { dependencies, player, settlers } = await setUp(),
      terrainWork = new TerrainWork(
        dependencies,
        knowledge,
        roadOn(1, 3),
        (): Promise<void> => Promise.resolve()
      );

    expect(terrainWork.order(new UnitOrder(player, settlers))).true;
    expect(settlers.busy()).to.not.equal(null);
  });

  it('should hand the worker back with no job to do', async (): Promise<void> => {
    const { dependencies, player, settlers } = await setUp();

    expect(
      new TerrainWork(
        dependencies,
        knowledge,
        { jobs: () => [], workersWanted: () => 0 },
        (): Promise<void> => Promise.resolve()
      ).order(new UnitOrder(player, settlers))
    ).false;
    expect(at(settlers.tile())).to.equal('1,3');
  });

  it('should hand the worker back when another player’s unit is near', async (): Promise<void> => {
    const { addPlayer, addUnit, dependencies, player, settlers } =
      await setUp();

    addUnit(Warrior, addPlayer(), 0, 3);

    expect(
      new TerrainWork(
        dependencies,
        knowledge,
        roadOn(3, 1),
        (): Promise<void> => Promise.resolve()
      ).order(new UnitOrder(player, settlers))
    ).false;
    expect(at(settlers.tile())).to.equal('1,3');
  });

  it('should travel the computer players’ way, and settle rather than work on its way to a city site', async (): Promise<void> => {
    const { dependencies, player, settlers, world } = await setUp(),
      memory = memoryRegistryInstance.memoryFor(player),
      travelled: string[] = [];

    expect(
      await new TerrainWork(
        dependencies,
        knowledge,
        roadOn(3, 1),
        async (dependencies, travelPlayer, memory, knowledge, unit) => {
          travelled.push(at(memory.unitPathData.get(unit)!.end()));
        }
      ).attempt(new PlayerAction(player, settlers))
    ).true;
    expect(travelled).to.eql(['3,1']);

    // On its way to a city site.
    memory.unitTargetData.set(settlers, world.get(6, 6));

    expect(
      await new TerrainWork(
        dependencies,
        knowledge,
        roadOn(3, 1),
        (): Promise<void> => Promise.resolve()
      ).attempt(new PlayerAction(player, settlers))
    ).false;
    expect(terrainJobs(memoryRegistryInstance.memoryFor(player)).has(settlers))
      .false;
  });

  it('should only handle workers', async (): Promise<void> => {
    const { addUnit, dependencies, player, settlers } = await setUp(),
      terrainWork = new TerrainWork(
        dependencies,
        knowledge,
        roadOn(3, 1),
        (): Promise<void> => Promise.resolve()
      );

    expect(terrainWork.handles(new PlayerAction(player, settlers))).true;
    expect(
      terrainWork.handles(
        new PlayerAction(player, addUnit(Warrior, player, 5, 5))
      )
    ).false;
  });
});

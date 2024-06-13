const generate = require('../core/index.js');
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const fs = require('fs');
const u = require('ak-tools');
dayjs.extend(utc);
require('dotenv').config();

const { applySkew,
	boxMullerRandom,
	choose,
	date,
	dates,
	day,
	exhaust,
	generateEmoji,
	getUniqueKeys,
	integer,
	mapToRange,
	person,
	pick,
	range,
	pickAWinner,
	weightedRange,
	enrichArray,
	fixFirstAndLast,
	generateUser,
	openFinder,
	progress,
	shuffleArray,
	shuffleExceptFirst,
	shuffleExceptLast,
	shuffleMiddle,
	shuffleOutside,
	streamCSV,
	streamJSON,
	weighArray,
	weighFunnels,
	buildFileNames,
	TimeSoup,
	getChance,
	initChance,
	validateEventConfig,
	validateTime,
	interruptArray,
	optimizedBoxMuller,
	inferFunnels,
	datesBetween
} = require('../core/utils.js');


describe('timesoup', () => {
	test('always valid times', () => {
		const dates = [];
		for (let i = 0; i < 10000; i++) {
			const earliest = dayjs().subtract(u.rand(5, 50), 'D');
			dates.push(TimeSoup());
		}
		const tooOld = dates.filter(d => dayjs(d).isBefore(dayjs.unix(0)));
		const badYear = dates.filter(d => !d.startsWith('202'));
		expect(dates.every(d => dayjs(d).isAfter(dayjs.unix(0)))).toBe(true);
		expect(dates.every(d => d.startsWith('202'))).toBe(true);

	});
});


describe('names', () => {

	test('default config', () => {
		const config = { simulationName: 'testSim' };
		const result = buildFileNames(config);
		expect(result.eventFiles).toEqual(['testSim-EVENTS.csv']);
		expect(result.userFiles).toEqual(['testSim-USERS.csv']);
		expect(result.scdFiles).toEqual([]);
		expect(result.groupFiles).toEqual([]);
		expect(result.lookupFiles).toEqual([]);
		expect(result.mirrorFiles).toEqual([]);
		expect(result.folder).toEqual('./');
	});

	test('json format', () => {
		const config = { simulationName: 'testSim', format: 'json' };
		const result = buildFileNames(config);
		expect(result.eventFiles).toEqual(['testSim-EVENTS.json']);
		expect(result.userFiles).toEqual(['testSim-USERS.json']);
	});

	test('with scdProps', () => {
		const config = {
			simulationName: 'testSim',
			scdProps: { prop1: {}, prop2: {} }
		};
		const result = buildFileNames(config);
		expect(result.scdFiles).toEqual([
			'testSim-prop1-SCD.csv',
			'testSim-prop2-SCD.csv'
		]);
	});

	test('with groupKeys', () => {
		const config = {
			simulationName: 'testSim',
			groupKeys: [['group1'], ['group2']]
		};
		const result = buildFileNames(config);
		expect(result.groupFiles).toEqual([
			'testSim-group1-GROUP.csv',
			'testSim-group2-GROUP.csv'
		]);
	});

	test('with lookupTables', () => {
		const config = {
			simulationName: 'testSim',
			lookupTables: [{ key: 'lookup1' }, { key: 'lookup2' }]
		};
		const result = buildFileNames(config);
		expect(result.lookupFiles).toEqual([
			'testSim-lookup1-LOOKUP.csv',
			'testSim-lookup2-LOOKUP.csv'
		]);
	});

	test('with mirrorProps', () => {
		const config = {
			simulationName: 'testSim',
			mirrorProps: { prop1: {} }
		};
		const result = buildFileNames(config);
		expect(result.mirrorFiles).toEqual(['testSim-MIRROR.csv']);
	});

	test('writeToDisk', async () => {
		const config = { simulationName: 'testSim', writeToDisk: true };
		const result = await buildFileNames(config);
		expect(result.folder).toBeDefined();

	});


	test('invalid simName', () => {
		const config = { simulationName: 123 };
		expect(() => buildFileNames(config)).toThrow('simName must be a string');
	});


	test('streamJSON: writes to file', async () => {
		const path = 'test.json';
		const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
		await streamJSON(path, data);
		const content = fs.readFileSync(path, 'utf8');
		const lines = content.trim().split('\n').map(line => JSON.parse(line));
		expect(lines).toEqual(data);
		fs.unlinkSync(path);
	});

	test('streamCSV: writes to file', async () => {
		const path = 'test.csv';
		const data = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
		await streamCSV(path, data);
		const content = fs.readFileSync(path, 'utf8');
		const lines = content.trim().split('\n');
		expect(lines.length).toBe(3); // Including header
		fs.unlinkSync(path);
	});


	test('generateUser: works', () => {
		const uuid = { guid: jest.fn().mockReturnValue('uuid-123') };
		const numDays = 30;
		const user = generateUser(numDays);
		expect(user).toHaveProperty('distinct_id');
		expect(user).toHaveProperty('name');
		expect(user).toHaveProperty('email');
		expect(user).toHaveProperty('avatar');
	});

	test('enrichArray: works', () => {
		const arr = [];
		const enrichedArray = enrichArray(arr);
		enrichedArray.hookPush(1);
		enrichedArray.hookPush(2);
		const match = JSON.stringify(enrichedArray) === JSON.stringify([1, 2]);
		expect(match).toEqual(true);
	});

});


describe('determinism', () => {
	test('initializes RNG with seed from environment variable', () => {
		process.env.SEED = 'test-seed';
		// @ts-ignore
		initChance();
		const chance = getChance();
		expect(chance).toBeDefined();
		expect(chance.random()).toBeGreaterThanOrEqual(0);
		expect(chance.random()).toBeLessThanOrEqual(1);

	});

	test('initializes RNG only once', () => {
		const seed = 'initial-seed';
		initChance(seed);
		const chance1 = getChance();
		initChance('new-seed');
		const chance2 = getChance();
		expect(chance1).toBe(chance2);

	});
});


describe('generation', () => {
	test('users: can make', () => {
		const numDays = 30;
		const user = generateUser('uuid-123', numDays);
		expect(user).toHaveProperty('distinct_id');
		expect(user).toHaveProperty('name');
		expect(user).toHaveProperty('email');
		expect(user).toHaveProperty('avatar');
		expect(user).toHaveProperty('created');
		expect(user).toHaveProperty('anonymousIds');
		expect(user).toHaveProperty('sessionIds');
	});

	test('user: in time range', () => {
		const numDays = 30;
		const user = generateUser('uuid-123', numDays);
		const createdDate = dayjs(user.created, 'YYYY-MM-DD');
		expect(createdDate.isValid()).toBeTruthy();
		expect(createdDate.isBefore(dayjs.unix(global.NOW))).toBeTruthy();
	});

	test('winner: return func', () => {
		const items = ['a', 'b', 'c'];
		const result = pickAWinner(items, 0);
		expect(typeof result).toBe('function');
	});

	test('winner: first most', () => {
		const items = ['a', 'b', 'c'];
		const mostChosenIndex = 0;
		const pickFunction = pickAWinner(items, mostChosenIndex);
		const weightedList = pickFunction();

		// Expect the most chosen item to appear at least once
		expect(weightedList.includes(items[mostChosenIndex])).toBeTruthy();
	});

	test('winner: second most', () => {
		const items = ['a', 'b', 'c'];
		const mostChosenIndex = 0;
		const pickFunction = pickAWinner(items, mostChosenIndex);
		const weightedList = pickFunction();

		const secondMostChosenIndex = (mostChosenIndex + 1) % items.length;

		// Expect the second most chosen item to appear at least once
		expect(weightedList.includes(items[secondMostChosenIndex])).toBeTruthy();
	});

	test('winner: third most', () => {
		const items = ['a', 'b', 'c'];
		const mostChosenIndex = 0;
		const pickFunction = pickAWinner(items, mostChosenIndex);
		const weightedList = pickFunction();

		const thirdMostChosenIndex = (mostChosenIndex + 2) % items.length;

		// Expect the third most chosen item to appear at least once
		expect(weightedList.includes(items[thirdMostChosenIndex])).toBeTruthy();
	});

	test('winner: exceed array bounds', () => {
		const items = ['a', 'b', 'c'];
		const mostChosenIndex = 0;
		const pickFunction = pickAWinner(items, mostChosenIndex);
		const weightedList = pickFunction();

		// Ensure all indices are within the bounds of the array
		weightedList.forEach(item => {
			expect(items.includes(item)).toBeTruthy();
		});
	});

	test('winner: single item array', () => {
		const items = ['a'];
		const mostChosenIndex = 0;
		const pickFunction = pickAWinner(items, mostChosenIndex);
		const weightedList = pickFunction();

		// Since there's only one item, all winner: he same
		weightedList.forEach(item => {
			expect(item).toBe('a');
		});
	});

	test('winner: empty array', () => {
		const items = [];
		const pickFunction = pickAWinner(items, 0);
		const weightedList = pickFunction();

		// Expect the result to be an empty array
		expect(weightedList.length).toBe(0);
	});

	test('dates: same start end', () => {
		const start = '2023-06-10';
		const end = '2023-06-10';
		const result = datesBetween(start, end);
		expect(result).toEqual([]);
	});

	test('dates: start after end', () => {
		const start = '2023-06-12';
		const end = '2023-06-10';
		const result = datesBetween(start, end);
		expect(result).toEqual([]);
	});

	test('dates: correct', () => {
		const start = '2023-06-10';
		const end = '2023-06-13';
		const result = datesBetween(start, end);
		expect(result).toEqual([
			'2023-06-10T12:00:00.000Z',
			'2023-06-11T12:00:00.000Z',
			'2023-06-12T12:00:00.000Z'
		]);
	});

	test('dates: unix times', () => {
		const start = dayjs('2023-06-10').unix();
		const end = dayjs('2023-06-13').unix();
		const result = datesBetween(start, end);
		expect(result).toEqual([
			'2023-06-10T12:00:00.000Z',
			'2023-06-11T12:00:00.000Z',
			'2023-06-12T12:00:00.000Z'
		]);
	});

	test('dates: mixed formats', () => {
		const start = '2023-06-10';
		const end = dayjs('2023-06-13').unix();
		const result = datesBetween(start, end);
		expect(result).toEqual([
			'2023-06-10T12:00:00.000Z',
			'2023-06-11T12:00:00.000Z',
			'2023-06-12T12:00:00.000Z'
		]);
	});

	test('dates: invalid dates', () => {
		const start = 'invalid-date';
		const end = '2023-06-13';
		const result = datesBetween(start, end);
		expect(result).toEqual([]);
	});

	test('dates: same day', () => {
		const start = '2023-06-10T08:00:00.000Z';
		const end = '2023-06-10T20:00:00.000Z';
		const result = datesBetween(start, end);
		expect(result).toEqual([]);
	});

	test('dates: leap years', () => {
		const start = '2024-02-28';
		const end = '2024-03-02';
		const result = datesBetween(start, end);
		expect(result).toEqual([
			'2024-02-28T12:00:00.000Z',
			'2024-02-29T12:00:00.000Z',
			'2024-03-01T12:00:00.000Z'
		]);
	});

});

describe('validation', () => {

	beforeAll(() => {
		global.NOW = 1672531200; // fixed point in time for testing
	});

	test('events: throws non array', () => {
		// @ts-ignore
		expect(() => validateEventConfig("not an array")).toThrow("events must be an array");
	});

	test('events: strings', () => {
		const events = ["event1", "event2"];
		const result = validateEventConfig(events);

		expect(result).toEqual([
			{ event: "event1", isFirstEvent: false, properties: {}, weight: expect.any(Number) },
			{ event: "event2", isFirstEvent: false, properties: {}, weight: expect.any(Number) },
		]);

		result.forEach(event => {
			expect(event.weight).toBeGreaterThanOrEqual(1);
			expect(event.weight).toBeLessThanOrEqual(5);
		});
	});

	test('events: objects', () => {
		const events = [{ event: "event1", properties: { a: 1 } }, { event: "event2", properties: { b: 2 } }];
		const result = validateEventConfig(events);

		expect(result).toEqual(events);
	});

	test('events: mix', () => {
		const events = ["event1", { event: "event2", properties: { b: 2 } }];
		// @ts-ignore
		const result = validateEventConfig(events);

		expect(result).toEqual([
			{ event: "event1", isFirstEvent: false, properties: {}, weight: expect.any(Number) },
			{ event: "event2", properties: { b: 2 } }
		]);

		expect(result[0].weight).toBeGreaterThanOrEqual(1);
		expect(result[0].weight).toBeLessThanOrEqual(5);
	});

	test('dates: between', () => {
		const chosenTime = global.NOW - (60 * 60 * 24 * 15); // 15 days ago
		const earliestTime = global.NOW - (60 * 60 * 24 * 30); // 30 days ago
		const latestTime = global.NOW;
		expect(validateTime(chosenTime, earliestTime, latestTime)).toBe(true);
	});

	test('dates: outside earliest', () => {
		const chosenTime = global.NOW - (60 * 60 * 24 * 31); // 31 days ago
		const earliestTime = global.NOW - (60 * 60 * 24 * 30); // 30 days ago
		const latestTime = global.NOW;
		expect(validateTime(chosenTime, earliestTime, latestTime)).toBe(false);
	});

	test('dates: outside latest', () => {
		const chosenTime = -1;
		const earliestTime = global.NOW - (60 * 60 * 24 * 30); // 30 days ago
		const latestTime = global.NOW;
		expect(validateTime(chosenTime, earliestTime, latestTime)).toBe(false);
	});

	test('dates: inference in', () => {
		const chosenTime = global.NOW - (60 * 60 * 24 * 15); // 15 days ago
		expect(validateTime(chosenTime)).toBe(true);
	});

	test('dates: inference out', () => {
		const chosenTime = global.NOW - (60 * 60 * 24 * 31); // 31 days ago
		expect(validateTime(chosenTime)).toBe(false);
	});
});

describe('enrichment', () => {
	test('hook works', () => {
		const arr = [];
		const hook = (item) => item * 2;
		const enrichedArray = enrichArray(arr, { hook });
		enrichedArray.hookPush(1);
		enrichedArray.hookPush(2);
		expect(enrichedArray.includes(2)).toBeTruthy();
		expect(enrichedArray.includes(4)).toBeTruthy();
	});

	test('filter empties', () => {
		const arr = [];
		const hook = (item) => item ? item.toString() : item;
		const enrichedArray = enrichArray(arr, { hook });
		enrichedArray.hookPush(null);
		enrichedArray.hookPush(undefined);
		enrichedArray.hookPush({});
		enrichedArray.hookPush({ a: 1 });
		enrichedArray.hookPush([1, 2]);
		expect(enrichedArray).toHaveLength(3);
		expect(enrichedArray.includes('null')).toBeFalsy();
		expect(enrichedArray.includes('undefined')).toBeFalsy();
		expect(enrichedArray.includes('[object Object]')).toBeTruthy();
		expect(enrichedArray.includes('1')).toBeTruthy();
		expect(enrichedArray.includes('2')).toBeTruthy();

	});


});


describe('utilities', () => {

	test('pick: works', () => {
		const array = [1, 2, 3];
		const item = pick(array);
		expect(array).toContain(item);
	});

	test('pick: null', () => {
		expect(pick(123)).toBe(123);
	});



	test('integer: diff', () => {
		const min = 5;
		const max = 10;
		const result = integer(min, max);
		expect(result).toBeGreaterThanOrEqual(min);
		expect(result).toBeLessThanOrEqual(max);
	});

	test('integer: same', () => {
		expect(integer(7, 7)).toBe(7);
	});




	test('person: fields', () => {
		const generatedPerson = person('myId');
		expect(generatedPerson).toHaveProperty('name');
		expect(generatedPerson).toHaveProperty('email');
		expect(generatedPerson).toHaveProperty('avatar');
	});


	test('date: past', () => {
		const pastDate = date(10, true, 'YYYY-MM-DD')();
		expect(dayjs(pastDate, 'YYYY-MM-DD').isValid()).toBeTruthy();
		expect(dayjs(pastDate).isBefore(dayjs())).toBeTruthy();
	});

	test('date: future', () => {
		const futureDate = date(10, false, 'YYYY-MM-DD')();
		expect(dayjs(futureDate, 'YYYY-MM-DD').isValid()).toBeTruthy();
		expect(dayjs(futureDate).isAfter(dayjs.unix(global.NOW))).toBeTruthy();
	});

	test('dates: pairs', () => {
		const datePairs = dates(10, 3, 'YYYY-MM-DD');
		expect(datePairs).toBeInstanceOf(Array);
		expect(datePairs).toHaveLength(3);
		datePairs.forEach(pair => {
			expect(pair).toHaveLength(2);
		});
	});

	test('choose: array', () => {
		const options = ['apple', 'banana', 'cherry'];
		const choice = choose(options);
		expect(options).toContain(choice);
	});

	test('choose: function', () => {
		const result = choose(() => 'test');
		expect(result).toBe('test');
	});

	test('choose: non-function / non-array', () => {
		expect(choose('test')).toBe('test');
		expect(choose(123)).toBe(123);
	});

	test('choose: nested functions', () => {
		const result = choose(() => () => () => 'nested');
		expect(result).toBe('nested');
	});

	test('weightedRange:  within range', () => {
		const values = weightedRange(5, 15);
		expect(values.every(v => v >= 5 && v <= 15)).toBe(true);
		expect(values.length).toBe(50);
	});

	test('applySkew: skews', () => {
		const value = optimizedBoxMuller();
		const skewedValue = applySkew(value, .25);
		expect(Math.abs(skewedValue)).toBeLessThanOrEqual(Math.abs(value) + 1);
	});

	test('mapToRange: works', () => {
		const value = 0;
		const mean = 10;
		const sd = 5;
		const mappedValue = mapToRange(value, mean, sd);
		expect(mappedValue).toBe(10);
	});



	test('exhaust: elements', () => {
		const arr = [1, 2, 3];
		const exhaustFn = exhaust([...arr]);
		expect(exhaustFn()).toBe(1);
		expect(exhaustFn()).toBe(2);
		expect(exhaustFn()).toBe(3);
		expect(exhaustFn()).toBeUndefined();
	});



	test('unique keys', () => {
		const objects = [{ a: 1, b: 2 }, { a: 3, c: 4 }, { a: 5, b: 6 }];
		const uniqueKeys = getUniqueKeys(objects);
		expect(uniqueKeys).toEqual(expect.arrayContaining(['a', 'b', 'c']));
	});


	test('times', () => {
		const dates = [];
		for (let i = 0; i < 10000; i++) {
			const earliest = dayjs().subtract(u.rand(5, 50), 'D');
			dates.push(TimeSoup());
		}
		const tooOld = dates.filter(d => dayjs(d).isBefore(dayjs.unix(0)));
		const badYear = dates.filter(d => !d.startsWith('202'));
		expect(dates.every(d => dayjs(d).isAfter(dayjs.unix(0)))).toBe(true);
		expect(dates.every(d => d.startsWith('202'))).toBe(true);

	});

	test('date', () => {
		const result = date();
		expect(dayjs(result()).isValid()).toBe(true);
	});

	test('dates', () => {
		const result = dates();
		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBe(5); // Assuming default numPairs is 5
		result.forEach(pair => {
			expect(pair).toBeInstanceOf(Array);
			expect(pair.length).toBe(2);
			expect(dayjs(pair[0]()).isValid()).toBe(true);
			expect(dayjs(pair[1]()).isValid()).toBe(true);
		});
	});

	test('day', () => {
		const start = '2020-01-01';
		const end = '2020-01-30';
		const result = day(start, end);
		const dayResult = result(0, 9);
		expect(dayjs(dayResult.day).isAfter(dayjs(dayResult.start))).toBe(true);
		expect(dayjs(dayResult.day).isBefore(dayjs(dayResult.end))).toBe(true);
	});

	test('exhaust', () => {
		const arr = [1, 2, 3];
		const next = exhaust(arr);
		expect(next()).toBe(1);
		expect(next()).toBe(2);
		expect(next()).toBe(3);
		expect(next()).toBe(undefined); // or whatever your implementation does after array is exhausted
	});

	test('emoji: works', () => {
		const emojis = generateEmoji(5)();
		expect(typeof emojis).toBe('string');
		if (!Array.isArray(emojis)) {
			expect(emojis.split(', ').length).toBeLessThanOrEqual(5);
		}
		if (Array.isArray(emojis)) {
			expect(emojis.length).toBeLessThanOrEqual(5);
		}
	});

	test('emoji: length', () => {
		const result = generateEmoji();
		const emojis = result();
		expect(typeof emojis).toBe('string');
		if (!Array.isArray(emojis)) {
			expect(emojis.split(', ').length).toBeLessThanOrEqual(10);
		}
		if (Array.isArray(emojis)) {
			expect(emojis.length).toBeLessThanOrEqual(10);
		}

	});


	test('weighArray: works', () => {
		const arr = ['a', 'b', 'c'];
		const weightedArr = weighArray(arr);
		expect(weightedArr.length).toBeGreaterThanOrEqual(arr.length);
	});

	test('weighFunnels: works', () => {
		const acc = [];
		const funnel = { weight: 3 };
		const result = weighFunnels(acc, funnel);
		expect(result.length).toBe(3);
	});

	test('progress: outputs correctly', () => {
		// @ts-ignore
		const mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => { });
		progress([['test', 50]]);
		expect(mockStdoutWrite).toHaveBeenCalled();
		mockStdoutWrite.mockRestore();
	});

	test('range: works', () => {
		const result = [];
		range.call(result, 1, 5);
		expect(result).toEqual([1, 2, 3, 4, 5]);
	});



	test('shuffleArray: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = shuffleArray([...arr]);
		expect(shuffled).not.toEqual(arr);
		expect(shuffled.sort()).toEqual(arr.sort());
	});

	test('shuffleExceptFirst: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = shuffleExceptFirst([...arr]);
		expect(shuffled[0]).toBe(arr[0]);
		expect(shuffled.slice(1).sort()).toEqual(arr.slice(1).sort());
	});

	test('shuffleExceptLast: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = shuffleExceptLast([...arr]);
		expect(shuffled[shuffled.length - 1]).toBe(arr[arr.length - 1]);
		expect(shuffled.slice(0, -1).sort()).toEqual(arr.slice(0, -1).sort());
	});

	test('fixFirstAndLast: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = fixFirstAndLast([...arr]);
		expect(shuffled[0]).toBe(arr[0]);
		expect(shuffled[shuffled.length - 1]).toBe(arr[arr.length - 1]);
		expect(shuffled.slice(1, -1).sort()).toEqual(arr.slice(1, -1).sort());
	});

	test('shuffleMiddle: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = shuffleMiddle([...arr]);
		expect(shuffled[0]).toBe(arr[0]);
		expect(shuffled[shuffled.length - 1]).toBe(arr[arr.length - 1]);
		expect(shuffled.slice(1, -1).sort()).toEqual(arr.slice(1, -1).sort());
	});

	test('shuffleOutside: works', () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = shuffleOutside([...arr]);
		expect(shuffled.slice(1, -1)).toEqual(arr.slice(1, -1));
	});

	test('box normal distribution', () => {
		const values = [];
		for (let i = 0; i < 10000; i++) {
			values.push(boxMullerRandom());
		}
		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
		const stdDev = Math.sqrt(variance);
		expect(mean).toBeCloseTo(0, 1);
		expect(stdDev).toBeCloseTo(1, 1);
	});

	test('optimized box normal distribution', () => {
		const values = [];
		for (let i = 0; i < 10000; i++) {
			values.push(optimizedBoxMuller());
		}
		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
		const stdDev = Math.sqrt(variance);
		expect(mean).toBeLessThan(1);
		expect(stdDev).toBeLessThan(1);
	});


});

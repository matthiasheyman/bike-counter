#!/usr/bin/env node
import {exit, stdin as input, stdout as output} from 'node:process';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import meow from 'meow';
import envPaths from 'env-paths';
import Conf from 'conf';
import {loadJsonFile} from 'load-json-file';
import {writeJsonFile} from 'write-json-file';
import {DateTime} from 'luxon';
import {type BikeDataStore} from './bike-counter.types.js';

const defaultStore: BikeDataStore = {counters: {}};
const name = 'BikeCounter';
const paths = envPaths(name);
const store = path.join(paths.data, `${name}.json`);
const today = DateTime.utc();
const currentMonth = today.month;

const config = new Conf({
	projectName: name,
	schema: {
		startOfMonth: {
			type: 'number',
			minimum: 1,
			maximum: 31,
			default: 26,
		},
		kilometersPerDay: {
			type: 'number',
			default: 38,
		},
	},
});

const cli = meow(
	`
  Usage
    $ bike-counter.js

    Options:
			--list, -l <month number>			List the total number of kilometers for a given month (Default: current month)
			--clear, -c										Clear the datastore
  `,
	{
		importMeta: import.meta,
		flags: {
			list: {
				type: 'number',
				choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
				isRequired: false,
				shortFlag: 'l',
			},
			clear: {
				type: 'boolean',
				default: false,
				shortFlag: 'c',
			},
		},
	},
);

if (cli.flags.clear) {
	await writeJsonFile(store, defaultStore);
	console.info('Datastore has been cleared');
	exit(0);
}

const dataStore = await loadStore();

if (cli.flags.list) {
	calculate();
	exit(0);
}

if (await hasRun()) {
	exit(0);
}

console.info('');
const rl = readline.createInterface({input, output});
const answer = (await rl.question('Did you bike to work today? [y/N]  ', {})) || 'N';
console.info('');

await storeResult(answer === 'y');

rl.close();

async function loadStore(): Promise<BikeDataStore> {
	let temporaryStore: BikeDataStore = defaultStore;
	try {
		const content = await loadJsonFile(store);
		console.log(content);
		temporaryStore = content as BikeDataStore;

		if (!temporaryStore.counters[currentMonth]) {
			temporaryStore.counters[currentMonth] = [];
		}
	} catch {
		return defaultStore;
	}

	return temporaryStore;
}

async function storeResult(biked: boolean) {
	if (!biked) {
		console.log('Too bad ...');
		return;
	}

	console.log('Nice');

	dataStore.counters[currentMonth]?.push(today.toISODate({format: 'basic'})!);
	await writeJsonFile(store, dataStore);
}

async function hasRun() {
	const todayString = today.toISODate({format: 'basic'})!;
	return dataStore.counters[currentMonth]?.includes(todayString);
}

function calculate() {
	const year = today.year;
	const month = (cli.flags.list ?? currentMonth);
	const endDay = (config.get('startOfMonth') as number) - 1;

	const end = DateTime.utc(year, month, endDay);
	const start = end.minus({months: 1});

	console.log({year, month, endDay});

	console.log('Calculate from', start.toISODate(), 'to', end.toISODate());
}


#!/usr/bin/env node
import {exit, stdin as input, stdout as output} from 'node:process';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import meow from 'meow';
import envPaths from 'env-paths';
import Conf from 'conf';
import dateFns from 'date-fns';
import {type BikeDataStore} from './bike-counter.types.js';

const name = 'BikeCounter';
const paths = envPaths(name);
const store = path.join(paths.data, `${name}.json`);

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

const today = new Date();
const currentMonth = dateFns.getMonth(today);

const dataStore = await loadStore(cli.flags.clear);

if (cli.flags.clear) {
	await writeDataStore();
	console.info('Datastore has been cleared');
	exit(0);
}

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

async function ensureDataStoreFile() {
	await mkdir(paths.data, {recursive: true});
	let content = '{"counters":{}}';
	try {
		content = await readFile(store, {encoding: 'utf8'});
	} catch {
		await writeFile(store, content);
	}

	return content;
}

async function loadStore(force: boolean): Promise<BikeDataStore> {
	let raw = await ensureDataStoreFile();

	if (raw.length === 0 || force) {
		raw = '';
	}

	const dataStore = JSON.parse(raw) as BikeDataStore;
	if (!dataStore.counters[currentMonth]) {
		dataStore.counters[currentMonth] = [];
	}

	return dataStore;
}

async function writeDataStore() {
	await writeFile(store, JSON.stringify(dataStore));
}

const dateFormatInStore = 'yyyyMMdd';
async function storeResult(biked: boolean) {
	if (!biked) {
		console.log('Too bad ...');
		return;
	}

	console.log('Well done!');

	dataStore.counters[currentMonth]?.push(dateFns.format(today, dateFormatInStore));
	await writeDataStore();
}

async function hasRun() {
	const formattedDate = dateFns.format(today, dateFormatInStore);
	return dataStore.counters[currentMonth]?.includes(formattedDate);
}

function calculate() {
	const year = dateFns.getYear(today);
	const monthIndex = (cli.flags.list ?? currentMonth) - 1;
	const endDay = (config.get('startOfMonth') as number) - 1;

	const end = new Date(year, monthIndex, endDay);
	const start = dateFns.addMonths(end, -1);

	console.log({year, monthIndex, endDay});

	console.log('Calculate from', start.getUTCDate(), 'to', end.getUTCDate());
}


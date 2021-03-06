const functions = require('./');
const config = require('../config').config;
const _ = require('lodash');

const dice = sides => _.random(1, sides);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

function polyhedral(sides, str, message) {
	let total = 0, r = 0, text = '', modifier;
	if (str.length > 0) modifier = +(str[str.length - 1]).replace(/\D/g, "");
	//no modifier
	if (str.length < 1) {
		total = dice(sides);
		text = ` rolled a d${sides}: ${total}`;
		//addition modifier
	} else if (str.some(e => e.includes('+'))) {
		r = dice(sides);
		total = r + modifier;
		text = ` rolled a d${sides}: ${r} + ${modifier} for at total of ${total}`;
		//subtraction modifier
	} else if (str.some(e => e.includes('-'))) {
		r = dice(sides);
		total = r - modifier;
		text = ` rolled a d${sides}: ${r} - ${modifier} for at total of ${total}`;
	}
	message.reply(text);
	return total;
}

async function buildPrefix(bot, message) {
	return new Promise(async resolve => {
		let prefix = await functions.readData(bot, message, 'prefix');
		if (!prefix) prefix = functions.config.prefix;

		if (message.content.includes(bot.user.id) && message.content.includes('prefix')) message.channel.send(`${bot.user.username} is using ${prefix} as the activator for this server`);
		//Ignore messages that dont include with the command symbol
		if (!message.content.includes(prefix)) resolve();
		resolve(prefix);
	}).catch(error => message.reply(`That's an Error! ${error} in buildPrefix`));
}

function buildParams(message, prefix) {
	let params = message.content.split(' ');
	if (!params[0].startsWith(prefix)) {
		let newParams = false;
		params.forEach((param, index) => {
			if (param.startsWith(prefix)) newParams = params.slice(index);
		});
		if (!newParams) return;
		params = newParams;
	}
	//remove user mentions
	params.forEach((param, index) => {
		if (param.includes('<') && param.includes('>')) params.splice(index, 1);
	});

	return params;
}

function buildCommand(params) {
	//create command
	if (!params[0]) return [false, params];
	let command = params[0].slice(1);
	params = params.slice(1);
	return [_.toLower(command), params];
}

function buildDescriptor(params) {
	let beg, end, desc = [];

	params.forEach((param, index) => {
		if (param.match(/['"`“”]/g)) {
			if (beg === undefined) {
				beg = index;
				end = index;
			} else end = index;
		}
	});

	if (beg !== undefined && end !== undefined) {
		desc = params.slice(beg, end + 1);
		params.splice(beg, end + 1 - beg);
		desc.forEach((word, index) => desc[index] = word.replace(/['"`“”]/g, ''));
		desc = desc.join(' ');
	}
	return [desc, params];
}

function buildStats(bot, message) {
	message.channel.send(`Currently there are ${bot.shard.count} shards.`).catch(console.error);
	bot.shard.broadcastEval('this.guilds.size')
		.then(results => message.channel.send(`Currently on ${results.reduce((prev, val) => prev + val, 0)} servers.`).catch(console.error))
		.catch(console.error);
	bot.shard.broadcastEval(`(${buildMemberList}).call(this)`)
		.then(list => {
			let users = _.sum(list);
			message.channel.send(`Currently assisting ${users} users.`).catch(console.error);
		}).catch(console.error);
}

function buildMemberList() {
	let users = 0;
	this.guilds.forEach(guild => users += +guild.memberCount);
	return users;
}

function checkPatreon(bot, authorID) {
	return new Promise((resolve, reject) => {
		bot.shard.broadcastEval(`(${checkRoles}).call(this, '${authorID}', '${config.patreonGuild}', '${config.patronDiceRole}')`)
			.then(array => resolve(array.some(toggle => toggle)))
			.catch(reject);
	});
}
function checkPatreonServer(bot, ownerID) {
	return new Promise((resolve, reject) => {
		bot.shard.broadcastEval(`(${checkRoles}).call(this, '${ownerID}', '${config.patreonGuild}', '${config.patronMegaRole}')`)
			.then(array => resolve(array.some(toggle => toggle)))
			.catch(reject);
	});
}

function checkRoles(userID, patreonGuild, patronRole) {
	const guild = this.guilds.get(patreonGuild);
	if (!guild) return null;
	return guild.roles.get(patronRole).members.some(member => member.user.id === userID);
}

exports.buildCommand = buildCommand;
exports.buildDescriptor = buildDescriptor;
exports.buildParams = buildParams;
exports.buildPrefix = buildPrefix;
exports.buildStats = buildStats;
exports.checkPatreon = checkPatreon;
exports.checkPatreonServer = checkPatreonServer;
exports.asyncForEach = asyncForEach;
exports.dice = dice;
exports.modifierRoll = polyhedral;
exports.sleep = sleep;



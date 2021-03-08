const { prompt } = require('enquirer');
const randexp = require('randexp')
const figlet = require('figlet');
const chalk = require('chalk');
const axios = require('axios');
const clear = require('clear');
const ask = require('./ask')
const fs = require('fs')

clear();

console.log(
    chalk.yellow(
        figlet.textSync('Token Checker', { horizontalLayout: 'full' })
    )
);

function header(token) {
    return {
        "Authorization": token
    }
}

function write(tokens, type) {
    fs.writeFileSync(`results/${type}.txt`, tokens.join("\n"))
    console.log(chalk.cyan("[Checker] ") + chalk.yellow(`Wrote ${type} tokens to: `) + chalk.gray(`/results/${type}.txt`));
}

(async () => {
    process.title = '[Checker]';
    let answers = await ask.options();
    let tokens = [];

    if (answers.generate) {
        const anwser = await prompt({
            type: 'input',
            name: 'amount',
            message: 'Please enter an amount to generate',
            validate(value) {
                if (isNaN(value)) {
                    return;
                }
                return true;
            }
        })

        let tokenRegex = new randexp(/[a-zA-Z0-9]{24}\.[a-zA-Z0-9]{6}\.[a-zA-Z0-9_\-]{27}|mfa\.[a-zA-Z0-9_\-]{84}/);

        for (let i = 0; i < Math.trunc(anwser.amount); i++) {
            tokens.push(tokenRegex.gen());
        }
    } else {
        tokens = fs.readFileSync('tokens.txt').toString().replace(/\r/gi, '').split("\n").filter(item => item);
    }

    if (tokens.length > 0) {
        const unverifiedTokens = [];
        const verifiedTokens = [];
        const lockedTokens = [];
        const invalidTokens = []

        console.log(chalk.cyan("[Checker] ") + chalk.yellow("Started!"));
        console.log('')

        for (let i = 0; i < tokens.length; i++) {
            if (!tokens[i].match(/[a-zA-Z0-9]{24}\.[a-zA-Z0-9]{6}\.[a-zA-Z0-9_\-]{27}|mfa\.[a-zA-Z0-9_\-]{84}/)) {
                invalidTokens.push(tokens[i])
                console.log(chalk.gray(`[${i}] `) + chalk.red('[!]  ') + chalk.yellow("Invalid token format"));
            } else {
                try {
                    let response = await axios.get('https://discordapp.com/api/v6/users/@me', { headers: header(tokens[i]) })
                    let res = response.data;

                    if (res.verified) {
                        verifiedTokens.push(tokens[i]);
                    } else {
                        unverifiedTokens.push(tokens[i]);
                    }

                    if (answers.showName) {
                        console.log(chalk.gray(`[${i}] `) + chalk.green(res.verified ? '[>>] ' : '[>]  ') + chalk.yellow("Token: ") + tokens[i] + chalk.gray(` [${res.username}#${res.discriminator}]`))
                    } else {
                        console.log(chalk.gray(`[${i}] `) + chalk.green(res.verified ? '[>>] ' : '[>]  ') + chalk.yellow("Token: ") + tokens[i])
                    }
                } catch (err) {
                    switch (err.response.status) {
                        case 401:
                            invalidTokens.push(tokens[i]);
                            console.log(chalk.gray(`[${i}] `) + chalk.red('[X]  ') + chalk.yellow("Token: ") + tokens[i])
                            break;
                        case 403:
                            lockedTokens.push(tokens[i]);
                            console.log(chalk.gray(`[${i}] `) + chalk.red('[L]  ') + chalk.yellow("Token: ") + tokens[i])
                            break;
                        case 429:
                            console.log(chalk.gray(`[${i}] `) + chalk.red('[!]  ') + chalk.yellow("You're getting rate limited"))
                            break;
                        default:
                            console.log(chalk.gray(`[${i}] `) + chalk.red('[?]  ') + chalk.yellow("We can't contact the discord api! The error code is: ") + chalk.gray(err.response.status))
                            break;
                    }
                }
            }

            process.title = `[Checker] - ${i + 1}/${tokens.length} Total Checked | ${unverifiedTokens.length + verifiedTokens.length} Working | ${lockedTokens.length} Locked | ${invalidTokens.length} Invalid`;

            if (i == tokens.length - 1) {
                const totalLength = unverifiedTokens.length + verifiedTokens.length + lockedTokens.length + invalidTokens.length;
                if (!fs.existsSync('results') && totalLength > 0) {
                    fs.mkdirSync('results');
                }

                console.log('')
                console.log(chalk.green(">  [Unverified] ") + chalk.yellow(unverifiedTokens.length))
                console.log(chalk.green(">> [Verified] ") + chalk.yellow(verifiedTokens.length))
                console.log(chalk.red("L  [Locked] ") + chalk.yellow(lockedTokens.length))
                console.log(chalk.red("X  [Invalid] ") + chalk.yellow(invalidTokens.length))
                console.log('')

                if (!unverifiedTokens.length == 0) write(unverifiedTokens, 'unverified');
                if (!verifiedTokens.length == 0) write(verifiedTokens, 'verified');
                if (!lockedTokens.length == 0) write(lockedTokens, 'locked');
                if (!invalidTokens.length == 0 && answers.saveInvalid) write(invalidTokens, 'invalid');

                console.log(chalk.cyan("[Checker] ") + chalk.yellow('Press any key to exit...'))

                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.on('data', process.exit.bind(process, 0));
            }
        }
    }
})()
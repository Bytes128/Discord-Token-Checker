const { prompt } = require('enquirer');

module.exports = {
    options: async () => {
        const questions = [
            {
                type: 'confirm',
                name: 'showName',
                message: 'Do you want to show the username of valid tokens?'
            },
            {
                type: 'confirm',
                name: 'saveInvalid',
                message: 'Do you want to save invalid tokens?'
            },
            {
                type: 'confirm',
                name: 'generate',
                message: "Do you want to generate tokens? [If set to false, it will look for a file named 'tokens.txt']",
            }
        ];
        return await prompt(questions);
    },
};
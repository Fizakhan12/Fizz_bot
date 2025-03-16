require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let userDatabase = {}; // Store users temporarily (Use a database for persistence)
let userLinkCount = {}; // Store link counts for each user

let userAdCount = {}; // Store counts per user per chat
let adCountingEnabled = {}; // Track if counting is enabled per chat
let activeUsers = {}; // Track users who send messages after /check 

// Handle /start command
const isAdminOrOwner = async (chatId, userId) => {
    try {
        const chatMember = await bot.getChatMember(chatId, userId);
        return chatMember.status === "administrator" || chatMember.status === "creator";
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
};
//check related code 
bot.onText(/\/check/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can start counting.");
    }

    // Reset counts and enable counting
    userAdCount[chatId] = {};
    activeUsers[chatId] = new Set();
    adCountingEnabled[chatId] = true;

    bot.sendMessage(chatId, "✅ Counting has started! Messages containing 'AD', 'all done', or 'done' will be counted.");
});

// Count messages only when counting is enabled
bot.on('message', (msg) => {
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();
    
    if (!adCountingEnabled[chatId]) return; // Ignore messages if counting hasn't started
    // Track active users
    activeUsers[chatId].add(username);
    const triggerWords = ["ad", "all done", "done"];
    if (triggerWords.includes(text)) {
        const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

        if (!userAdCount[chatId][username]) {
            userAdCount[chatId][username] = 0;
        }
        userAdCount[chatId][username] += 1;
    }
});


// Admin stops counting and displays results with /total_ad
bot.onText(/\/count_ad/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can stop counting and view results.");
    }

    if (!userAdCount[chatId] || Object.keys(userAdCount[chatId]).length === 0) {
        return bot.sendMessage(chatId, "📊 No messages were counted.");
    }

    let totalCount = 0;
    let response = "📊 **Total Counts per User:**\n";
    var index=1;
    for (const [username, count] of Object.entries(userAdCount[chatId])) {
        totalCount += count;
        response += `${index}. ${username}: ${count} times\n`;
        index++;
    }

    response += `\n🔹 **Total Count in Chat:** ${totalCount}`;

    // Stop counting after displaying results
    adCountingEnabled[chatId] = false;

    bot.sendMessage(chatId, response);
});
bot.onText(/\/unsafelist/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins can use this command.");
    }

    if (!adCountingEnabled[chatId]) {
        return bot.sendMessage(chatId, "⚠️ Counting was not started. Use /check first.");
    }

    try {
        const chatMembers = await bot.getChatAdministrators(chatId);
        const allUsers = new Set(activeUsers[chatId]); // Users who sent any message
        const usersWhoSentAd = new Set(Object.keys(userAdCount[chatId])); // Users who sent an AD message

        let unsafeUsers = [];
        for (let user of allUsers) {
            if (!usersWhoSentAd.has(user)) {
                unsafeUsers.push(user);
            }
        }

        if (unsafeUsers.length === 0) {
            return bot.sendMessage(chatId, "✅ Everyone has sent an AD-related message.");
        }

        let response = "🚨 **Users who didn't send an AD message:**\n";
        unsafeUsers.forEach((user, index) => {
            response += `${index + 1}. ${user}\n`;
        });

        bot.sendMessage(chatId, response);
    } catch (error) {
        console.error("Error fetching group members:", error);
        bot.sendMessage(chatId, "❌ Error retrieving group members.");
    }
});

// Handle /start command (Only Admins & Owner)
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can use this command.");
    }

    userLinkCount[chatId] = {}; // Reset link count for the group

    bot.sendMessage(chatId, `✅ Hello ${msg.from.first_name}! I will now count the links sent in this chat.`);
});

// Count links in messages
// bot.on('message', (msg) => {
//     if (!msg.text) return;
    
//     const chatId = msg.chat.id;
//     const userId = msg.from.id;

//     // Check if message contains a link
//     const linkPattern = /(https?:\/\/[^\s]+)/g;
//     if (msg.text.match(linkPattern)) {
//         if (!userLinkCount[chatId]) {
//             userLinkCount[chatId] = {};
//         }
//         if (!userLinkCount[chatId][userId]) {
//             userLinkCount[chatId][userId] = 0;
//         }
//         userLinkCount[chatId][userId] += 1;
//     }
// });

// Handle /total command (Only Admins & Owner)
bot.onText(/\/total/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can use this command.");
    }

    if (!userLinkCount[chatId] || Object.keys(userLinkCount[chatId]).length === 0) {
        return bot.sendMessage(chatId, "📊 No links have been counted yet.");
    }

    let totalLinks = 0;
    let response = "📊 **Total Links Count:**\n";
    
    for (const [id, count] of Object.entries(userLinkCount[chatId])) {
        totalLinks += count;
        const user = userDatabase[id]; // Fetch stored username or full name

        // const displayName = user
        //     ? `@${user.username || user.name}`
        //     : `User ID: ${id}`;
        
        // response += `👤 ${displayName}: ${count} links\n`;
    }

    response += `\n🔹 **Total Links in Chat:** ${totalLinks}`;
    bot.sendMessage(chatId, response);
});



// Store usernames and user IDs when users send messages
bot.on('message', (msg) => {
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const name = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
    
    // Check if message contains a link
    const linkPattern = /(https?:\/\/[^\s]+)/g;
    if (msg.text.match(linkPattern)) {
        if (!userLinkCount[chatId]) {
            userLinkCount[chatId] = {};
        }
        if (!userLinkCount[chatId][userId]) {
            userLinkCount[chatId][userId] = 0;
        }
        userLinkCount[chatId][userId] += 1;

        // Store only users who have sent links
        if (username) {
            userDatabase[username.toLowerCase()] = userId;
        }
        console.log(userDatabase,"userDatabase")
    }
});

bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can use this command.");
    }

    if (!userLinkCount[chatId] || Object.keys(userLinkCount[chatId]).length === 0) {
        return bot.sendMessage(chatId, "📊 No users have sent links yet.");
    }

    let response = "📋 **Users who sent links:**\n";
    let index = 1;

    for (const [userId, count] of Object.entries(userLinkCount[chatId])) {
        const username = Object.keys(userDatabase).find(key => userDatabase[key] == userId);
        if (username) {
            response += `${index++}. 👤 @${username} - ID: ${userId} - Links: ${count}\n`;
        }
    }

    bot.sendMessage(chatId, response);
});
bot.onText(/\/multiplelinks/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check if user is an admin or owner
    if (!(await isAdminOrOwner(chatId, userId))) {
        return bot.sendMessage(chatId, "❌ Only admins and the owner can use this command.");
    }

    if (!userLinkCount[chatId] || Object.keys(userLinkCount[chatId]).length === 0) {
        return bot.sendMessage(chatId, "📊 No users have sent multiple links.");
    }

    let response = "📋 **Users who sent multiple links:**\n";
    let index = 1;
    let foundUsers = false;

    for (const [userId, count] of Object.entries(userLinkCount[chatId])) {
        if (count > 1) { // Only show users who sent more than 1 link
            const username = Object.keys(userDatabase).find(key => userDatabase[key] == userId);
            if (username) {
                response += `${index++}. 👤 @${username} - ID: ${userId} - Links: ${count}\n`;
                foundUsers = true;
            }
        }
    }

    if (!foundUsers) {
        return bot.sendMessage(chatId, "📊 No users have sent multiple links.");
    }

    bot.sendMessage(chatId, response);
});




// Detect "@username @mute" pattern
bot.on('message', async (msg) => {
    if (!msg.text || !msg.text.includes('/mute')) return;

    const chatId = msg.chat.id;
    const words = msg.text.split(" ");

    // Find mentioned username
    let username = words.find(word => word.startsWith('@') && word !== '/mute');

    if (!username) {
        return bot.sendMessage(chatId, "Please mention a valid username after /mute.");
    }

    username = username.slice(1).toLowerCase(); // Remove '@' and lowercase it

    const userId = userDatabase[username];

    if (!userId) {
        return bot.sendMessage(chatId, `User @${username} not found.`);
    }

    try {
        await bot.restrictChatMember(chatId, userId, {
            permissions: {
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false
            }
        });

        bot.sendMessage(chatId, `User @${username} has been muted.`);
    } catch (error) {
        console.error("Mute Error:", error);
        bot.sendMessage(chatId, `Failed to mute user: ${error.message}`);
    }
});

bot.on('message', async (msg) => {
    if (!msg.text || !msg.text.includes('/ban')) return;

    const chatId = msg.chat.id;
    const words = msg.text.split(" ");

    // Find mentioned username
    let username = words.find(word => word.startsWith('@') && word !== '/ban');

    if (!username) {
        return bot.sendMessage(chatId, "Please mention a valid username after /ban.");
    }

    username = username.slice(1).toLowerCase(); // Remove '@' and lowercase it

    const userId = userDatabase[username];

    if (!userId) {
        return bot.sendMessage(chatId, `User @${username} not found. They need to send a message first.`);
    }

    try {
        await bot.banChatMember(chatId, userId);
        bot.sendMessage(chatId, `User @${username} has been banned.`);
    } catch (error) {
        console.error("Ban Error:", error);
        bot.sendMessage(chatId, `Failed to ban user: ${error.message}`);
    }
});
bot.on('message', async (msg) => {
    if (!msg.text || !msg.text.includes('/unban')) return;

    const chatId = msg.chat.id;
    const words = msg.text.split(" ");

    // Find mentioned username
    let username = words.find(word => word.startsWith('@') && word !== '/unban');

    if (!username) {
        return bot.sendMessage(chatId, "Please mention a valid username after /unban.");
    }

    username = username.slice(1).toLowerCase(); // Remove '@' and lowercase it

    const userId = userDatabase[username];

    if (!userId) {
        return bot.sendMessage(chatId, `User @${username} not found.`);
    }

    try {
        await bot.unbanChatMember(chatId, userId);
        bot.sendMessage(chatId, `User @${username} has been unbanned.`);
    } catch (error) {
        console.error("Unban Error:", error);
        bot.sendMessage(chatId, `Failed to unban user: ${error.message}`);
    }
});
bot.on('message', async (msg) => {
    if (!msg.text || !msg.text.includes('/unmute')) return;

    const chatId = msg.chat.id;
    const words = msg.text.split(" ");

    // Find mentioned username
    let username = words.find(word => word.startsWith('@') && word !== '/unmute');

    if (!username) {
        return bot.sendMessage(chatId, "Please mention a valid username after /unmute.");
    }

    username = username.slice(1).toLowerCase(); // Remove '@' and lowercase it

    const userId = userDatabase[username];

    if (!userId) {
        return bot.sendMessage(chatId, `User @${username} not found.`);
    }

    try {
        await bot.restrictChatMember(chatId, userId, {
            permissions: {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
                can_change_info: false,
                can_invite_users: true,
                can_pin_messages: false
            },
            until_date: 0 // Ensure the user is unmuted permanently
        });

        bot.sendMessage(chatId, `User @${username} has been unmuted.`);
    } catch (error) {
        console.error("Unmute Error:", error);
        bot.sendMessage(chatId, `Failed to unmute user: ${error.message}`);
    }
});


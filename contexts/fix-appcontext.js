// Quick fix script to add admin fields to AppContext
// Run this in the contexts directory

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'AppContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the handleGroupCreated function
const oldPattern = `\t\t\t\tcreatorId: data.group.creatorId,
\t\t\t\tmembers: data.group.members,`;

const newPattern = `\t\t\t\tcreatorId: data.group.creatorId,
\t\t\t\tisPrivate: data.group.isPrivate,
\t\t\t\tadmins: data.group.admins || [],
\t\t\t\tmembers: data.group.members,
\t\t\t\tpendingMembers: data.group.pendingMembers || [],`;

content = content.replace(oldPattern, newPattern);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed AppContext.tsx - added admin fields to handleGroupCreated');

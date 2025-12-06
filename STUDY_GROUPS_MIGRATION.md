# Study Groups Firebase Migration

## Overview

Study groups have been successfully migrated from AsyncStorage to Firestore for real-time synchronization across devices and proper multi-user collaboration.

## What Changed

### Data Storage

- **Before**: Study groups stored in AsyncStorage (local device only)
- **After**: Study groups stored in Firestore (cloud-based, real-time sync)

### Architecture Changes

#### Firestore Structure

```
studyGroups (collection)
├── {groupId} (document)
│   ├── name: string
│   ├── className: string
│   ├── school: string
│   ├── description: string
│   ├── code: string (unique join code)
│   ├── creatorId: string (user ID)
│   ├── members: array of {email, joinedAt}
│   ├── createdAt: timestamp
│   └── messages (subcollection)
│       └── {messageId} (document)
│           ├── senderEmail: string
│           ├── message: string
│           ├── attachments: array
│           └── createdAt: timestamp
```

### Updated Functions

#### `createStudyGroup()`

- Now uses `addDoc()` to create documents in Firestore
- Automatically adds creator as first member
- Returns the new group with generated ID and code
- **Async**: Must be awaited

#### `joinStudyGroup()`

- Uses `updateDoc()` to add members to the members array
- Real-time updates reflected across all devices
- **Async**: Must be awaited

#### `sendGroupMessage()`

- Uses Firestore subcollection (`studyGroups/{id}/messages`)
- Messages sync in real-time via separate listener
- **Async**: Must be awaited

#### `deleteStudyGroup()`

- Uses `deleteDoc()` to remove the group document
- Only the creator can delete (enforced by security rules)
- **Note**: Messages in subcollection become orphaned (should be handled by Cloud Functions in production)
- **Async**: Must be awaited

### Real-time Updates

Two separate listeners are now active:

1. **Study Groups Listener**: Monitors the main studyGroups collection

   - Filters groups where user is a member or creator
   - Updates when groups are created, joined, or deleted

2. **Messages Listeners**: One per group the user is a member of
   - Monitors each group's messages subcollection
   - Updates in real-time when new messages are sent

### Removed

- `syncStudyGroupsMutation` - No longer needed (Firestore handles persistence)
- AsyncStorage queries for study groups

## Security Rules

Security rules have been implemented in `firestore.rules`:

### Study Groups

- **Read**: Users can only read groups they're members of
- **Create**: Any authenticated user can create a group
- **Update**: Only members can update the group (e.g., when joining)
- **Delete**: Only the group creator can delete the group

### Messages

- **Read/Write**: Only members of the parent study group can read or write messages

## Deployment Instructions

1. **Deploy Firestore Rules**:

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **No data migration needed**: Since this is a new feature, no existing data needs to be migrated from AsyncStorage.

## Verification Checklist

- [x] Create a new study group
- [x] Join an existing group using code
- [x] Send messages in a group
- [x] Verify real-time updates across devices
- [x] Delete a study group (creator only)
- [x] Security rules prevent unauthorized access

## Known Limitations

1. **Message Cleanup**: When a study group is deleted, messages in the subcollection are orphaned. In production, implement a Cloud Function to cascade delete:

   ```javascript
   // Example Cloud Function
   exports.cleanupGroupMessages = functions.firestore
   	.document("studyGroups/{groupId}")
   	.onDelete(async (snap, context) => {
   		const batch = admin.firestore().batch();
   		const messages = await admin
   			.firestore()
   			.collection("studyGroups")
   			.doc(context.params.groupId)
   			.collection("messages")
   			.get();

   		messages.docs.forEach((doc) => batch.delete(doc.ref));
   		await batch.commit();
   	});
   ```

2. **Array Query Limitation**: Currently using client-side filtering for membership checks. Consider creating a composite index for better performance:
   ```
   Collection: studyGroups
   Fields: members.email (Array), createdAt (Descending)
   ```

## Testing Notes

- All study group functions are now async and must be awaited
- Update any UI components calling these functions to handle promises
- Messages appear in real-time without manual refresh
- Multiple users can collaborate simultaneously with live updates

## Future Enhancements

- [ ] Add typing indicators for messages
- [ ] Implement read receipts
- [ ] Add file attachment support with Firebase Storage
- [ ] Implement push notifications for new messages
- [ ] Add group member roles (admin, member, etc.)
- [ ] Implement message reactions/emoji

# Firebase Study Groups - Deployment Guide

## Pre-Deployment Checklist

### 1. Firestore Security Rules

Deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

**File**: `firestore.rules`

### 2. Firestore Indexes (Optional but Recommended)

For better performance with array queries, create the following composite index:

**Via Firebase Console**:

1. Go to Firebase Console → Firestore Database → Indexes
2. Create a composite index:
   - Collection: `studyGroups`
   - Fields:
     - `members` (Array)
     - `createdAt` (Descending)

**Or via command line** (if you have a firestore.indexes.json file):

```bash
firebase deploy --only firestore:indexes
```

### 3. Test the Implementation

#### Test 1: Create a Study Group

1. Log in to the app
2. Navigate to Study Groups tab
3. Click "Create Group"
4. Fill in: Name, Class, School, Description
5. Verify you receive a group code
6. Check Firestore console to see the document

#### Test 2: Join a Study Group

1. On a second device/account, log in
2. Navigate to Study Groups
3. Click "Join Group"
4. Enter the group code and your email
5. Verify you can see the group
6. Check that the member was added in Firestore

#### Test 3: Send Messages

1. In the joined group, send a message
2. Verify it appears in real-time on both devices
3. Check the messages subcollection in Firestore

#### Test 4: Real-time Sync

1. With both devices viewing the same group
2. Send a message from Device A
3. Verify it appears instantly on Device B
4. Repeat from Device B

#### Test 5: Delete a Group

1. As the group creator, long-press the group
2. Confirm deletion
3. Verify the group disappears from both devices
4. Verify the document is removed from Firestore

### 4. Cloud Functions (Future Enhancement)

Consider implementing this Cloud Function to clean up orphaned messages:

**File**: `functions/index.js`

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.cleanupGroupMessages = functions.firestore
	.document("studyGroups/{groupId}")
	.onDelete(async (snap, context) => {
		const groupId = context.params.groupId;
		const messagesRef = admin
			.firestore()
			.collection("studyGroups")
			.doc(groupId)
			.collection("messages");

		const snapshot = await messagesRef.get();
		const batch = admin.firestore().batch();

		snapshot.docs.forEach((doc) => {
			batch.delete(doc.ref);
		});

		await batch.commit();
		console.log(`Deleted ${snapshot.size} messages for group ${groupId}`);
	});
```

Deploy with:

```bash
firebase deploy --only functions
```

## Post-Deployment Verification

### Check Firestore Console

1. Open Firebase Console
2. Navigate to Firestore Database
3. Verify collections structure:
   ```
   studyGroups/
   ├── [groupId]/
   │   ├── name
   │   ├── className
   │   ├── school
   │   ├── description
   │   ├── code
   │   ├── creatorId
   │   ├── members[]
   │   ├── createdAt
   │   └── messages/
   │       └── [messageId]/
   │           ├── senderEmail
   │           ├── message
   │           ├── attachments[]
   │           └── createdAt
   ```

### Monitor Usage

- **Firestore**: Watch document reads/writes in Usage tab
- **Authentication**: Verify user sessions
- **Errors**: Check Functions logs if using Cloud Functions

## Rollback Plan

If issues arise:

1. **Revert code changes**:

   ```bash
   git revert <commit-hash>
   ```

2. **No data loss**: Since we migrated from AsyncStorage (local), no cloud data needs recovery

3. **Security rules**: Keep rules restrictive until issues are resolved

## Known Limitations

1. **Message Cleanup**: Orphaned messages remain when groups are deleted (requires Cloud Function)
2. **Client-side Filtering**: Members array filtering happens client-side (can be optimized with indexes)
3. **No Offline Support Yet**: Consider enabling Firestore persistence for offline support:
   ```typescript
   import { enableIndexedDbPersistence } from "firebase/firestore";
   enableIndexedDbPersistence(db).catch((err) => {
   	if (err.code === "failed-precondition") {
   		console.log("Multiple tabs open");
   	} else if (err.code === "unimplemented") {
   		console.log("Browser does not support");
   	}
   });
   ```

## Performance Tips

1. **Limit Query Results**: Add `.limit(50)` to queries if groups list grows large
2. **Pagination**: Implement pagination for messages in large groups
3. **Composite Indexes**: Create indexes for frequently queried field combinations
4. **Batch Operations**: Use batch writes when updating multiple documents

## Monitoring

### Key Metrics to Track

- Number of study groups created per day
- Average number of messages per group
- Number of active users in groups
- Firestore read/write operations
- Average response time for group operations

### Firebase Console

- Monitor costs in Billing section
- Check Performance Monitoring for app performance
- Review Crashlytics for any crashes related to study groups

## Support

For issues or questions:

1. Check Firebase Console logs
2. Review `STUDY_GROUPS_MIGRATION.md` for implementation details
3. Check TypeScript errors in VS Code
4. Review Firestore security rules for access issues

## Success Criteria

✅ Users can create study groups
✅ Users can join groups with codes
✅ Messages sync in real-time
✅ Groups are properly secured
✅ No unauthorized access
✅ Real-time updates work across devices
✅ Clean error handling and user feedback

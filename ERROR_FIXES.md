# Backend Error Fixes Summary

## Issues Fixed

### 1. ✅ Mongoose Duplicate Index Warnings
**Problem**: Mongoose was warning about duplicate index definitions for `creatorId` and `code` fields in the StudyGroup model.

**Error Message**:
```
[MONGOOSE] Warning: Duplicate schema index on {"creatorId":1} found
[MONGOOSE] Warning: Duplicate schema index on {"code":1} found
```

**Solution**: Removed `index: true` from the schema field definitions since indexes were already being created using `schema.index()` at the bottom of the file.

**File Modified**: `backend/models/StudyGroup.js`

**Changes**:
- Removed `index: true` from `code` field (line 25)
- Removed `index: true` from `creatorId` field (line 30)
- Kept the index definitions at lines 71-73

---

### 2. ✅ User Deletion Error
**Problem**: When deleting a user, the system was trying to query study groups incorrectly, causing a Mongoose error.

**Error Message**:
```
Error deleting user data: ObjectParameterError: Parameter "obj" to Document() must be an object, got "DitPMUXQsZXvWkwGzcBm20Q6LEQ2" (type string)
```

**Root Cause**: 
1. The `members` array in StudyGroup was missing the `userId` field
2. The deletion logic was querying `{ members: userId }` which tried to match the entire object instead of a field within it
3. The filter logic was treating members as strings instead of objects

**Solution**: 
1. Added `userId` field to the members schema in StudyGroup model
2. Updated the query to use `{ 'members.userId': userId }` with proper $or conditions
3. Fixed the filter logic to access `member.userId` instead of treating member as a string
4. Added logic to remove user from admins array
5. Improved ownership transfer logic to prefer admins over regular members

**Files Modified**: 
- `backend/models/StudyGroup.js` - Added userId to members schema
- `backend/server.js` - Fixed user deletion logic

**Key Changes**:

#### StudyGroup Model:
```javascript
// Before
members: [{
    email: { type: String, required: true },
    name: String,
    joinedAt: { type: Date, default: Date.now },
}],

// After
members: [{
    email: { type: String, required: true },
    name: String,
    userId: String, // Firebase UID - ADDED
    joinedAt: { type: Date, default: Date.now },
}],
```

#### User Deletion Logic:
```javascript
// Before
const userGroups = await StudyGroup.find({ members: userId });
group.members = group.members.filter(memberId => memberId !== userId);

// After
const userGroups = await StudyGroup.find({
    $or: [
        { 'members.userId': userId },
        { creatorId: userId },
        { admins: userId }
    ]
});
group.members = group.members.filter(member => member.userId !== userId);
```

---

## Testing Recommendations

1. **Duplicate Index Warnings**: 
   - Restart the backend server
   - Check logs - warnings should no longer appear

2. **User Deletion**: 
   - Test deleting a user account
   - Verify that:
     - User is removed from all study groups
     - Empty groups are deleted
     - Ownership is transferred correctly
     - No errors appear in logs

## Important Notes

- The `userId` field in members array should be populated when users join study groups
- Existing study groups may have members without `userId` - you may need to run a migration script to add userId to existing members
- The deletion logic now properly handles users who are:
  - Regular members
  - Admins
  - Creators

## Migration Needed

If you have existing study groups, you'll need to add `userId` to existing members. This can be done by matching the email addresses with user records in your database.

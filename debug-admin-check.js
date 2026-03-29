// Debug script to check if admin data is present
// Add this temporarily to study-groups.tsx to debug

// In the component, add this useEffect:
useEffect(() => {
    console.log('=== STUDY GROUPS DEBUG ===');
    console.log('Total groups:', studyGroups.length);
    studyGroups.forEach((group, index) => {
        console.log(`Group ${index + 1}:`, {
            name: group.name,
            id: group.id,
            creatorId: group.creatorId,
            admins: group.admins,
            hasAdmins: !!group.admins,
            adminsLength: group.admins?.length,
            userUid: user?.uid,
            isUserAdmin: group.admins?.includes(user?.uid || ''),
        });
    });
}, [studyGroups, user?.uid]);

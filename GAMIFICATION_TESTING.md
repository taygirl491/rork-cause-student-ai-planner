# Gamification Testing Guide

## Overview
This guide shows you how to test your gamification logic including points, levels, streaks, and activity tracking.

## Your Gamification System

### Points & Levels
- **Level Thresholds**:
  - Level 1: 0-149 points
  - Level 2: 150-499 points
  - Level 3: 500-749 points
  - Level 4: 750-999 points
  - Level 5: 1000-1999 points
  - Level 6: 2000-2999 points
  - Level 7: 3000-3999 points
  - Level 8: 4000-4999 points
  - Level 9: 5000-5999 points
  - Level 10: 6000+ points (max level)

### Activity Types
- `task` - Completing tasks
- `streak` - Maintaining daily streaks
- `goal` - Completing goals
- `habit` - Completing habits
- `feature` - Using app features

---

## Testing Methods

### Method 1: Manual Testing in the App (Recommended for Quick Tests)

#### Test Streak Points
1. Open the app and navigate to the home screen
2. Check your current streak in the StreakContext
3. Complete a task to trigger streak check
4. Verify points are awarded (check console logs)

#### Test Task Completion Points
1. Create a new task
2. Mark it as complete
3. Check if points were awarded
4. Verify level updates if threshold crossed

#### Test Goal/Habit Completion
1. Create a goal with habits
2. Complete habits
3. Check points increase
4. Verify activity counters increment

**Check Points & Level:**
- Look at your profile/account screen
- Points and level should display
- Console logs will show: `[Gamification] Points awarded: X, New level: Y`

---

### Method 2: API Testing with Postman/Thunder Client

#### Setup
1. Install Thunder Client extension in VS Code (or use Postman)
2. Get your user ID from the app (check console logs or Firebase)
3. Use your backend URL: `https://rork-cause-student-ai-planner.onrender.com`

#### Test 1: Get Current Stats
```http
GET /api/gamification/stats/:userId
```
**Example:**
```
GET https://rork-cause-student-ai-planner.onrender.com/api/gamification/stats/YOUR_USER_ID
```

**Expected Response:**
```json
{
  "points": 150,
  "level": 2,
  "gamification": {
    "habitsCompleted": 5,
    "featuresUsed": 10,
    "goalsCompleted": 2
  }
}
```

#### Test 2: Award Points Manually
```http
POST /api/gamification/award
Content-Type: application/json

{
  "userId": "YOUR_USER_ID",
  "points": 50,
  "activityType": "task"
}
```

**Expected Response:**
```json
{
  "points": 200,
  "level": 2,
  "leveledUp": false,
  "pointsAdded": 50
}
```

#### Test 3: Test Level Up
Award enough points to cross a threshold:
```json
{
  "userId": "YOUR_USER_ID",
  "points": 400,
  "activityType": "streak"
}
```

**Expected Response:**
```json
{
  "points": 600,
  "level": 3,
  "leveledUp": true,
  "pointsAdded": 400
}
```

---

### Method 3: Automated Testing with curl (Command Line)

#### Get Stats
```bash
curl https://rork-cause-student-ai-planner.onrender.com/api/gamification/stats/YOUR_USER_ID
```

#### Award Points
```bash
curl -X POST https://rork-cause-student-ai-planner.onrender.com/api/gamification/award \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "points": 50,
    "activityType": "task"
  }'
```

---

### Method 4: Create a Test Script

Create a file `test-gamification.js` in your backend folder:

```javascript
const axios = require('axios');

const API_URL = 'https://rork-cause-student-ai-planner.onrender.com';
const USER_ID = 'YOUR_USER_ID'; // Replace with your test user ID

async function testGamification() {
  console.log('🎮 Testing Gamification System\n');

  try {
    // Test 1: Get initial stats
    console.log('📊 Test 1: Getting initial stats...');
    const statsResponse = await axios.get(`${API_URL}/api/gamification/stats/${USER_ID}`);
    console.log('Initial Stats:', statsResponse.data);
    console.log('✅ Test 1 Passed\n');

    // Test 2: Award small points (no level up)
    console.log('🎯 Test 2: Awarding 25 points...');
    const award1 = await axios.post(`${API_URL}/api/gamification/award`, {
      userId: USER_ID,
      points: 25,
      activityType: 'task'
    });
    console.log('Result:', award1.data);
    console.log(award1.data.leveledUp ? '🎉 Level Up!' : '📈 Points added');
    console.log('✅ Test 2 Passed\n');

    // Test 3: Award large points (likely level up)
    console.log('🚀 Test 3: Awarding 500 points...');
    const award2 = await axios.post(`${API_URL}/api/gamification/award`, {
      userId: USER_ID,
      points: 500,
      activityType: 'streak'
    });
    console.log('Result:', award2.data);
    console.log(award2.data.leveledUp ? '🎉 LEVEL UP!' : '📈 Points added');
    console.log('✅ Test 3 Passed\n');

    // Test 4: Get final stats
    console.log('📊 Test 4: Getting final stats...');
    const finalStats = await axios.get(`${API_URL}/api/gamification/stats/${USER_ID}`);
    console.log('Final Stats:', finalStats.data);
    console.log('✅ Test 4 Passed\n');

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testGamification();
```

**Run the test:**
```bash
cd backend
node test-gamification.js
```

---

### Method 5: Test Level Calculation Logic

Create `test-level-calculation.js`:

```javascript
const { calculateLevel, LEVEL_THRESHOLDS } = require('./gamificationService');

console.log('🧪 Testing Level Calculation Logic\n');

const testCases = [
  { points: 0, expectedLevel: 1 },
  { points: 100, expectedLevel: 1 },
  { points: 150, expectedLevel: 2 },
  { points: 500, expectedLevel: 3 },
  { points: 750, expectedLevel: 4 },
  { points: 1000, expectedLevel: 5 },
  { points: 2000, expectedLevel: 6 },
  { points: 7000, expectedLevel: 10 },
  { points: 10000, expectedLevel: 10 }, // Max level
];

let passed = 0;
let failed = 0;

testCases.forEach(({ points, expectedLevel }) => {
  const actualLevel = calculateLevel(points);
  const status = actualLevel === expectedLevel ? '✅' : '❌';
  
  console.log(`${status} Points: ${points} → Level: ${actualLevel} (Expected: ${expectedLevel})`);
  
  if (actualLevel === expectedLevel) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log(failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed');
```

**Run:**
```bash
cd backend
node test-level-calculation.js
```

---

## Testing Checklist

### Basic Functionality
- [ ] Points are awarded correctly
- [ ] Level calculation is accurate
- [ ] Level up detection works
- [ ] Activity counters increment

### Edge Cases
- [ ] Awarding 0 points
- [ ] Negative points (should reject)
- [ ] Points exceeding max level threshold
- [ ] Multiple rapid point awards
- [ ] Invalid user ID handling

### Integration Tests
- [ ] Task completion awards points
- [ ] Streak maintenance awards points
- [ ] Goal completion awards points
- [ ] Habit completion awards points
- [ ] Points persist after app restart

---

## Debugging Tips

### Enable Console Logging
Check these logs in your app:
```
[Gamification] Points awarded: X
[Gamification] Level up! New level: Y
[StreakContext] Streak updated
```

### Check MongoDB Database
Use MongoDB Compass or Atlas to verify:
- User `points` field updates
- User `level` field updates
- `gamification` object updates

### Common Issues

**Points not updating:**
- Check if API endpoint is being called
- Verify user ID is correct
- Check backend logs for errors

**Level not changing:**
- Verify points crossed threshold
- Check `calculateLevel()` function
- Ensure `user.save()` is called

**Activity counters not incrementing:**
- Verify `activityType` is passed correctly
- Check if `user.gamification` object exists
- Ensure proper activity type names

---

## Quick Test Commands

```bash
# Test with curl (replace USER_ID)
curl https://rork-cause-student-ai-planner.onrender.com/api/gamification/stats/USER_ID

# Award 100 points
curl -X POST https://rork-cause-student-ai-planner.onrender.com/api/gamification/award \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","points":100,"activityType":"task"}'
```

---

## Recommended Testing Flow

1. **Start Fresh**: Note your current points/level
2. **Award Small Points**: Test with 25-50 points
3. **Verify Update**: Check stats endpoint
4. **Test Level Up**: Award enough to cross threshold
5. **Verify Level Up**: Confirm `leveledUp: true`
6. **Test Activities**: Try each activity type
7. **Check Persistence**: Restart app, verify points remain

---

## Need Help?

If tests fail:
1. Check console logs in app
2. Check backend logs on Render
3. Verify MongoDB data
4. Test API endpoints directly
5. Review gamificationService.js logic

Good luck testing! 🎮✨

# 🚌 SafeRoute - Simple Service Management

**STOP STRUGGLING WITH MULTIPLE SERVICES!** 

This guide makes starting/stopping SafeRoute **SUPER SIMPLE** with just **ONE COMMAND**.

---

## ⚡ Quick Start (Easiest Way)

### Just Double-Click:
```
start.bat
```

That's it! This starts:
- ✅ API Server (port 3001)
- ✅ GPS Service (port 8081)  
- ✅ Admin Panel (port 3000)

And shows you a health check to confirm everything works!

---

## 📋 All Available Commands

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `start.bat` | Start ALL services | Every time you work on SafeRoute |
| `stop.bat` | Stop ALL services | When you're done working |
| `health.bat` | Check if services are healthy | When something seems wrong |

---

## 🖥️ Alternative: Use NPM Commands

```bash
# Start everything (same as start.bat)
npm run start

# Stop everything (same as stop.bat)
npm run stop

# Check health (same as health.bat)
npm run health

# Run tests
npm run test
```

---

## 🔧 Individual Services (Advanced)

If you need to run just one service:

```bash
# Just the API
npm run dev:api

# Just the GPS service
npm run dev:gps

# Just the admin panel
npm run dev:admin

# Driver mobile app
npm run dev:driver

# Parent mobile app  
npm run dev:parent
```

---

## 🗂️ Service Ports Reference

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| API Server | 3001 | http://localhost:3001 | Backend API |
| GPS Service | 8081 | http://localhost:8081 | Real-time GPS |
| Admin Panel | 3000 | http://localhost:3000 | Web dashboard |
| Driver App | 8080 (Expo) | Expo Go app | Driver mobile |
| Parent App | 8082 (Expo) | Expo Go app | Parent mobile |

---

## 🩺 Troubleshooting

### Problem: "Port already in use"
**Solution:** Run `stop.bat` first, then `start.bat`

### Problem: "Services won't start"
**Solution:** 
1. Run `stop.bat` to kill everything
2. Wait 5 seconds
3. Run `start.bat` again

### Problem: "GPS service not connecting to database"
**Solution:** This is normal! It uses memory fallback and still works.

### Problem: "Can't see admin panel"
**Solution:** 
- Check if `http://localhost:3000` opens
- If not, the admin window might be minimized - look in taskbar

---

## 📊 Understanding the Windows

When you run `start.bat`, **3 separate windows** open:

1. **"SafeRoute API"** - The backend server
   - Shows API requests
   - Database connections
   - WebSocket events

2. **"SafeRoute GPS"** - The GPS tracking service
   - Shows GPS pings coming in
   - Database saves

3. **"SafeRoute Admin"** - The web dashboard
   - Next.js compilation
   - Page loads

💡 **Don't close these windows!** They're your services running.
When done, run `stop.bat` or close all windows.

---

## 🎯 Common Workflows

### Daily Development:
```
1. Double-click start.bat
2. Wait for "🎉 SafeRoute is running!"
3. Open http://localhost:3000
4. Work on your code
5. When done, run stop.bat
```

### Testing GPS:
```
1. Make sure start.bat is running
2. Open http://localhost:3000/fleet
3. Start driver app
4. Watch real-time tracking!
```

### Database Changes:
```
npm run db:generate  # After schema changes
npm run db:studio    # View database GUI
```

---

## ✅ Service Health Indicators

Run `health.bat` anytime to check:

```
✅ API Server: HEALTHY      ← Good!
✅ GPS Service: HEALTHY      ← Good!
✅ Admin Panel: HEALTHY      ← Good!

❌ API Server: NOT RUNNING   ← Run start.bat
❌ GPS Service: NOT RUNNING  ← Run start.bat
```

---

## 🚨 Emergency Stop

If everything freezes:

```bash
# Nuclear option - kills everything
taskkill /F /IM node.exe
taskkill /F /IM go.exe
```

Or simply restart your computer.

---

## 💡 Pro Tips

1. **Always use `start.bat`** - Don't try to start services manually
2. **Always use `stop.bat`** when done - Don't just close windows
3. **If in doubt, restart** - stop.bat → wait 5s → start.bat
4. **Check health** - Run health.bat before testing

---

## 🎓 Learning the System

### Phase 1 (Current - COMPLETE ✅)
- API, GPS, Admin are production-ready
- Just run `start.bat` and everything works

### Phase 2 (Coming Soon)
- Driver App - Run `npm run dev:driver` separately
- Parent App - Run `npm run dev:parent` separately

---

## 📞 Need Help?

1. Check service status: `health.bat`
2. Restart everything: `stop.bat` → `start.bat`
3. Check logs in each service window
4. Run tests: `npm run test`

---

## 🎯 Remember This!

| You Want To | Do This |
|-------------|---------|
| Start working | `start.bat` |
| Stop working | `stop.bat` |
| Check status | `health.bat` |
| Test system | `npm run test` |

**That's it! No confusion, no complexity.**

---

**SafeRoute Phase 1 is running smoothly! 🎉**

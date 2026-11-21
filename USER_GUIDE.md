# MindLC Executive CMO Cockpit — Complete First-Time User Guide

Welcome to **`mindlc-marketingV2`**, the Human-in-the-Loop (HITL) AI Marketing Command Center for **MindLC**.

---

## 1. What This App Does (In Plain English)

Most AI marketing tools let you generate endless social posts, blogs, and ad copy—which often leads to **"busywork drift"** (spending hours publishing content that doesn't actually convert Ontario parents into paying customers).

This app is engineered around **one concrete business goal**:
> **Acquire MindLC’s first 100 paid Ontario Grades 9–12 STEM students on the Tier 2 Managed Hybrid Plan ($139 CAD/month = $13,900 CAD MRR)** by pairing **Human Learning Managers** (for weekly accountability) with **24/7 Socratic AI** (for guided step-by-step hints that never hand over the final answer).

Instead of acting like a generic chatbot, the app operates as a **disciplined CMO Decision Cockpit** with 4 built-in guardrails:
1. **It locks out guesswork (Weekly Reality Gate):** You cannot generate new campaigns until you log your actual weekly funnel numbers and 2 real quotes/objections from Ontario parents.
2. **It enforces focus (Single-Bottleneck Lock-In):** When you have 0–25 students, it locks your team onto fixing **Diagnostic-to-Paid Conversion (≥ 25%)** and blocks distractions like cold ad scaling or SEO blog clusters.
3. **It stress-tests every idea (Devil's Advocate & Kill Criteria):** Every AI draft comes with a *Primary Failure Hypothesis*, a *Blind-Spot Question*, and a *Stop-Loss Kill Threshold* so you know when to pull the plug.
4. **It requires a 30-Second Human Sign-Off:** Nothing goes live until you verify 3 checkboxes (*Ontario K/T/C/A Context*, *Single CTA*, and *Brand Trust*).

---

## 2. Understanding the Screen in 3 Seconds (`Macro → Meso → Micro`)

When you open **http://localhost:3000**, the screen is divided into **3 levels of progressive disclosure**:

### Level 1: The Macro Command Strip (Sticky Top Bar)
Always visible across the very top of your screen so you never lose sight of the big picture:
1. **North Star Progress Pill (Top Left):** Shows `Paid Students: 14 / 100` (`$1,946 MRR`) and a 3-segment progress bar marking the **25**, **60**, and **100** student milestones.
2. **Active Bottleneck Lock Badge:** Shows which stage is currently locked (e.g., `🔒 Stage 1: Fix Diag → Paid (Target ≥ 25%)`). **Click this badge** anytime to open a popover showing which campaign types are **Allowed (✓)** vs. **Blocked (✕)**, or to simulate Stages 1, 2, and 3.
3. **Live Mini-Funnel Health Strip (Center):** Shows your latest 4-step conversion chain:
   `Contacts 64 → Diag Booked 28% → Diag Done 78% → Paid 14% (Bottleneck)`
   The app automatically highlights your **weakest conversion step in Rose/Amber** so you immediately see where parents are dropping off.
4. **Reality Gate Status Button (Top Right):**
   - **Green (`✓ Reality Gate Current`):** You’re unlocked and ready to work.
   - **Pulsing Amber (`⚠️ Log Weekly Reality (60s) to Unlock Proposals`):** The gate is locked. Click it to enter this week’s numbers. *(Tip: Click the small padlock icon next to it anytime to test locking and unlocking the gate!)*

---

### Level 2: The Meso Pipeline & VoC Rail (Left Sidebar)
Your prioritized work queue, organized from highest urgency at the top to historical memory at the bottom:
- **Top Mode Bar:** Lets you switch between **`Micro Cockpit`** (default), **`5-Horizon Planner`**, **`Market Intel`**, **`Skills`**, and **`Persona`**.
- **`+ New Proposal` Button:** Click to draft a new stage-aligned campaign proposal. *(If the Weekly Reality Gate is locked, this button disables automatically and reminds you to complete the 60-second check first.)*
- **4 Prioritized Queue Buckets:**
  - 🔴 **Kill-Criteria Triggered:** Live campaigns that failed their stop-loss threshold. **Always check these first** to execute their fallback pivot.
  - 🟡 **Awaiting CMO Decision:** Drafts and AI revisions waiting for your refinement and 30-second approval.
  - 🟢 **Approved / Live:** Proposals you’ve signed off on that are currently running in the field.
  - ⚪ **Archived / Killed:** Click to expand rejected drafts and see the 1-line reason why they were killed (your team's institutional memory).
- **VoC Verbatim Vault (Pinned to Bottom Left):** Click this button to open a slide-over drawer containing all real Ontario parent quotes grouped by objection tag (`AI Cheating`, `Curriculum K/T/C/A`, `Price`, `Trust`, `Student Motivation`) and see how many proposals address each quote.

---

### Level 3: The Micro Decision & Refinement Stage (Main Split Workspace)
When you click any proposal card in the Left Sidebar, it opens in the main split workspace:
- **Left Pane (60% width): The Proposal Artifact & Risk Guardrails**
  - **Header Card:** Edit the title, check the **Target Metric** pill, verify the **Single CTA Focus box** in 1 second, switch between versions (**`v1`**, **`v2`**, **`v3`**), or toggle **`Show Changes Diff`** to compare the old version against the new version side-by-side.
  - **Rendered Proposal Artifact:** Read or directly edit the script/copy, or click **`Copy Markdown`** / **`Export`**.
  - **VoC Grounding Strip:** Shows the exact verbatim parent quotes (`[VOC-101]`, `[VOC-102]`, etc.) that this proposal resolves.
  - **Mandatory Risk & Stop-Loss Card (Bottom 2 Columns):**
    - **Amber Box (Devil's Advocate):** Tells you the *Primary Failure Hypothesis* (why parents might reject this) and asks one sharp *Blind-Spot Question*.
    - **Rose Box (Kill Criteria):** Defines the exact *Sample Threshold* (e.g., 12 parent calls), *Stop-Loss Trigger* (e.g., < 25% conversion), and *Fallback Pivot Action*.
- **Right Pane (40% width): Conversational Co-Pilot & Sticky 30-Second Approval Dock**
  - **Top Scrollable Chat:** Shows the AI’s strategic rationale and change summaries (`✨ Updated v2: Removed grade guarantee...`).
  - **3 Quick-Steer Chips + Input Box:** Click **`Soften sales tone`**, **`Sharpen Ontario K/T/C/A angle`**, or **`Challenge my assumption`**, or type any instruction and press `Enter` to generate a new version (`v2`, `v3`) in real time.
  - **Sticky 30-Second CMO Approval Dock (Pinned Bottom Right):** Contains the 3 mandatory checkboxes required to unlock the **`Approve & Lock Asset`** button.

---

## 3. Step-by-Step Operating Routine for First-Time Users

Follow these 5 steps to run your weekly and daily marketing workflow:

### Step 1: Log Your 60-Second Weekly Reality Check (Every Monday)
1. Click the **`✓ Reality Gate Current`** (or **`⚠️ Log Weekly Reality`**) button in the top-right corner of the Macro Command Strip.
2. In the modal that opens:
   - **Section 1 (Funnel Numbers):** Enter how many parents you reached (`Contacts`), how many booked a diagnostic (`Diag Booked`), how many attended (`Diag Completed`), and how many enrolled at $139/mo (`Paid`). Notice how the conversion percentages calculate live as you type!
   - **Section 2 (Verbatim Parent Objections):** Type or paste **at least 2 exact quotes** you heard from Ontario parents this week (for example: *"My son uses ChatGPT to finish homework in 5 minutes and then gets 56% on his MHF4U unit test"*) and click the matching tag chip (`AI Cheating`, `Curriculum`, `Price`, `Trust`, or `Student Motivation`).
   - **Section 3 (Top Winning Touchpoint):** Write the single channel or moment that got the best parent reaction this week.
3. Click **`Submit Reality Log & Calibrate Proposals`**.
   - **What happens automatically:** The "Sample Seed Data" tag clears, your top-bar Mini-Funnel updates, the new parent quotes are injected into the AI's memory cache, and any live campaign that fell below its stop-loss threshold is automatically flagged into 🔴 **Kill-Criteria Triggered**!

---

### Step 2: Check Your Bottleneck Stage Lock
1. Click the **`🔒 Stage 1: Fix Diag → Paid (Target ≥ 25%)`** badge in the top bar.
2. Review what is **Allowed** vs. **Blocked**:
   - **Stage 1 (0–25 Paid Students):** You are locked to fixing post-diagnostic conversion (10-minute parent debrief scripts, K/T/C/A Cognitive Reports, 72-hr undecided follow-ups, and 30-day guarantee framing). Cold paid ads and SEO blog clusters are blocked.
   - **Stage 2 (26–60 Paid Students):** Unlocks Week 4–6 parent referral flows, GTA school community seminars, and `MPM2D`/`MCR3U`/`MHF4U`/`SBI3U` unit-test lead magnets.
   - **Stage 3 (61–100 Paid Students):** Unlocks Mississauga, Oakville, Markham, and Toronto Meta/Google ad scaling with a `< $150 CAD` Blended CAC cap.
3. **Want to test how the guardrail protects you?** While in Stage 1, go to the Right Pane chat box and type:
   `"Launch a cold Facebook ad campaign and SEO blog cluster"`
   The AI will **block the request**, show you your live bottleneck math (`14% Diag-to-Paid`), suggest an in-scope Stage 1 alternative, and require you to click **`Confirm Explicit Stage Override`** if you truly want to override the rule.

---

### Step 3: Triage the Left Sidebar Queue (`Meso Rail`)
1. Look at the Left Sidebar under **🔴 Kill-Criteria Triggered**:
   - Click on **`Generic '24/7 AI Math Bot' Cold Parent Message`**.
   - Read the Rose banner at the top of the Left Pane: it explains *why* it breached stop-loss (leading with "24/7 AI" triggered parent cheating fears before the Human Learning Manager was introduced) and tells you the exact **Fallback Pivot Action** in the Rose Kill Criteria box.
2. Next, look under **🟡 Awaiting CMO Decision**:
   - Click on **`10-Min Parent Debrief Script & K/T/C/A Cognitive Report Close ($139 CAD/mo)`**.

---

### Step 4: Inspect, Compare Versions & Steer with the AI Co-Pilot
With the **10-Min Parent Debrief Script** open in the main workspace:
1. **Check the Single CTA Focus:** Look at the indigo box at the top of the Left Pane—verify in 1 second that the script asks the parent for **one clear action**.
2. **Compare Versions (`Show Changes Diff`):**
   - In the top-right of the Left Pane header card, click **`Show Changes Diff`**.
   - You will see a side-by-side comparison of **`v1` (Rose)** vs. **`v2` (Emerald)** showing how the risky "guaranteed grade improvements" promise was removed and replaced with the Ontario K/T/C/A breakdown and 30-Day Active-Habit Guarantee. Click `Show Changes Diff` again to return to editor view.
3. **Steer the Draft via Chat (Create `v3`):**
   - Look at the bottom of the Right Pane chat thread and click one of the **3 Quick-Steer Chips**:
     - **`Soften sales tone`** (reframes the script into a calm Ontario STEM educator advisory tone)
     - **`Sharpen Ontario K/T/C/A angle`** (adds an explicit Knowledge, Thinking, Communication & Application rubric breakdown for `MHF4U` and `SBI3U`)
     - **`Challenge my assumption`** (runs a deeper Devil's Advocate stress-test and adds a teen co-commitment protocol)
   - Or type your own instruction in the chat box and press **`Enter`**.
   - **Watch what happens:** The Left Pane **flash-highlights in Indigo**, a new **`v3`** button appears in the Version Selector, and a concise change pill (`✨ Updated v3: ...`) appears in the chat thread!

---

### Step 5: Complete the Sticky 30-Second CMO Approval Dock
Once you are satisfied with the draft and have read the **Amber Devil's Advocate Box** and **Rose Kill Criteria Box** at the bottom of the Left Pane:
1. Look at the dark **Sticky 30-Second CMO Approval Checklist** pinned to the bottom-right corner.
2. Tick all 3 verification checkboxes:
   - `[x]` **Ontario Context:** Speaks to real Ontario K/T/C/A, unit test, or anti-cheating concerns.
   - `[x]` **Single CTA:** Asks the parent to take exactly one clear next step.
   - `[x]` **Brand Trust:** Zero hype or exaggerated grade guarantees.
3. As soon as all 3 boxes are checked (`3/3 Verified`), the primary button turns Emerald: click **`Approve & Lock Asset`**.
   - The proposal immediately moves into the **🟢 Approved / Live** bucket in your Left Sidebar, and the **`Copy Markdown`** button turns green so you can paste or export it for immediate use!
4. *(Optional)* If a draft is bad, click **`Reject / Kill`** instead, type a 1-line reason, and click **`Archive & Log Reason (⚪)`** or **`Flag Stop-Loss Breached (🔴)`**.

---

## 4. Using the Additional Command Modules (Top-Left Mode Switcher)

At the very top of the Left Sidebar, you can switch between the **`Micro Cockpit`** and 4 supporting strategic modules:

1. **`5-Horizon Planner` (`CMO Multi-Horizon Planner & Autonomous Agents`):**
   - View concrete, zero-jargon marketing activities across **Daily**, **Weekly**, **Monthly**, **Quarterly**, and **Annual** tabs.
   - Use the **Interactive CMO Plan Q&A bar** to ask strategic questions or adjust priorities—the system answers and injects new tasks directly into the schedule.
   - Click **`Dispatch Agent to Execute →`** on any task (or **`Run Autonomous Agent Sprint`**) to have one of your **5 Specialist Agents** (`Agent-01 Intel`, `Agent-02 STEM Lead Magnets`, `Agent-03 GTA Ads`, `Agent-04 Stage-1 CRO`, `Agent-05 Lifecycle`) draft a complete proposal card straight into your Cockpit queue.
2. **`Market Intel` (`Ontario Education Trend Radar & Competitor Matrix`):**
   - **Live Competitor URL Scanner:** Paste any competitor’s website URL (e.g., `https://www.mathnasium.ca` or `https://tvolearn.com`) and click **`Analyze Competitor & Build Wedge →`**. The server fetches their live HTML, detects what they miss (such as Ontario course codes or Socratic anti-cheating guardrails), and generates a counter-positioning battlecard.
   - **Ontario Education Trend Radar:** Tracks GTA midterm report card windows, Grade 9 EQAO `MTH1W` dates, and OUAC university cutoffs.
3. **`Skills` (`Marketing Skill Library CRUD`):**
   - View, edit, create, or delete the underlying AI system prompts (`cro`, `copywriting`, `copy-editing`, `social-content`, `ai-seo`) used by the Co-Pilot.
4. **`Persona` (`AI Settings, MindLC Persona & Database Schema`):**
   - Edit MindLC’s core positioning hook, `$139 CAD/mo Tier 2 Managed Hybrid` offer details, and inspect the live **Context-Cached Gemini System Prompt** and **PostgreSQL Schema**.

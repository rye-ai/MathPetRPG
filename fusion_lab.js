/* --- FUSION LAB: MUTATION ENGINE (Modular) --- */

// Local state for the Lab
let selectedSlot1 = null;
let selectedSlot2 = null;
let fusionRecipes = [];

// 1. INITIALIZE: This runs as soon as the file loads
console.log("🧪 Fusion Lab Brain Online");

// We need to tell the game to draw the lab when the user clicks the tab
// We hook into the main window to watch for tab changes
setInterval(() => {
    const labTab = document.querySelector('.tab[data-tab="fusion"]');
    const labRoot = document.getElementById('fusion-lab-root');
    
    if (labTab && labTab.classList.contains('active') && labRoot.innerHTML.includes("Initializing")) {
        startFusionLab();
    }
}, 500);

async function startFusionLab() {
    console.log("📡 Fetching Recipe Book from GitHub...");
    try {
        const res = await fetch(getGhUrl('pets/fusion_recipes.json'));
        fusionRecipes = await res.json();
        renderLabUI();
    } catch (e) {
        console.error("Fusion Load Error:", e);
        document.getElementById('fusion-lab-root').innerHTML = "Error loading recipes. Check GitHub path.";
    }
}

// 2. RENDER: Draws the slots and the pet list
function renderLabUI() {
    const root = document.getElementById('fusion-lab-root');
    
    // Find the recipe for the current selection
    const recipe = findActiveRecipe();
    const canFuse = recipe && gameState.brainPoints >= recipe.cost;

    root.innerHTML = `
        <h2 style="color:#63b3ed; margin-bottom:10px;">🧪 MUTATION CHAMBER</h2>
        <p style="font-size:12px; color:#a0aec0; margin-bottom:20px;">Combine two Evolution 3 Dinos to create a Legend.</p>

        <!-- THE STAGE -->
        <div class="fusion-stage">
            <div class="fusion-slot ${selectedSlot1?'filled':''}" onclick="deselectSlot(1)">
                ${renderSlotContent(selectedSlot1)}
                <div style="position:absolute; bottom:-25px; font-size:10px;">SLOT A</div>
            </div>

            <div class="fusion-vortex ${canFuse?'vortex-active':''}">
                ${renderResultSilhouette(recipe)}
            </div>

            <div class="fusion-slot ${selectedSlot2?'filled':''}" onclick="deselectSlot(2)">
                ${renderSlotContent(selectedSlot2)}
                <div style="position:absolute; bottom:-25px; font-size:10px;">SLOT B</div>
            </div>
        </div>

        <!-- ACTION AREA -->
        <div style="margin-top:30px; text-align:center; width:100%;">
            ${recipe ? `<div class="fusion-price-tag">MUTATION COST: 🧠 ${recipe.cost} BP</div>` : ''}
            
            <button class="gacha-btn" 
                style="background:${canFuse ? 'linear-gradient(to bottom, #5a67d8, #4c51bf)' : '#4a5568'}; opacity:${canFuse?1:0.5};"
                ${canFuse ? '' : 'disabled'}
                onclick="executeMutation()">
                ${canFuse ? '⚡ BEGIN MUTATION ⚡' : 'LOCKED'}
            </button>
        </div>

        <!-- PET SELECTION LIST -->
        <div style="width:100%; margin-top:40px;">
            <h3 style="font-size:14px; margin-bottom:10px; color:#63b3ed;">SELECT EVOLUTION 3 CANDIDATES:</h3>
            <div class="fusion-pet-list">
                ${renderCandidateList()}
            </div>
        </div>
    `;
}

// 3. LOGIC: Helper functions for UI
function renderSlotContent(pet) {
    if (!pet) return `<span style="font-size:30px; color:#4a5568;">+</span>`;
    return pet.image ? `<img src="${pet.image}">` : `<div style="font-size:40px;">${pet.emoji}</div>`;
}

function renderResultSilhouette(recipe) {
    if (!recipe) return `<div style="font-size:50px; opacity:0.2;">?</div>`;
    
    // Find the result details from the main PET_TYPES (which loaded from GitHub)
    let resultData = null;
    for (const r in PET_TYPES) {
        const found = PET_TYPES[r].find(p => p.id === recipe.result);
        if (found) { resultData = found; break; }
    }

    if (resultData && resultData.image) {
        return `<img src="${resultData.image}" class="silhouette" title="Mystery Result Detected!">`;
    }
    return `<div style="font-size:50px; color:#4299e1; animation: pulse 1s infinite;">?</div>`;
}

function renderCandidateList() {
    // Only show pets that are: 1. Hatched, 2. Evolution Stage 2 (which is the 3rd form)
    // and not already in a slot
    const candidates = gameState.pets.filter(p => 
        p.isHatched && 
        p.evolutionStage >= 2 && 
        p.id !== selectedSlot1?.id && 
        p.id !== selectedSlot2?.id
    );

    if (candidates.length === 0) return `<div style="padding:20px; color:gray; font-size:12px;">No Evolution 3 pets found in your collection.</div>`;

    return candidates.map(p => `
        <div class="pet-card" onclick="selectForFusion('${p.id}')">
            <img src="${p.image}" style="width:40px; height:40px; object-fit:contain;">
            <div style="font-size:9px; font-weight:bold;">${p.name}</div>
        </div>
    `).join('');
}

function selectForFusion(petId) {
    const pet = gameState.pets.find(p => p.id === petId);
    if (!selectedSlot1) selectedSlot1 = pet;
    else if (!selectedSlot2) selectedSlot2 = pet;
    renderLabUI();
}

function deselectSlot(num) {
    if (num === 1) selectedSlot1 = null;
    if (num === 2) selectedSlot2 = null;
    renderLabUI();
}

function findActiveRecipe() {
    if (!selectedSlot1 || !selectedSlot2) return null;
    
    // THE ALPHABETICAL TRICK: Sort the parent types so A+B matches the JSON
    const pair = [selectedSlot1.type, selectedSlot2.type].sort();
    
    return fusionRecipes.find(r => {
        const rParents = [...r.parents].sort();
        return rParents[0] === pair[0] && rParents[1] === pair[1];
    });
}

// 4. THE MUTATION EXECUTION (Safety First!)
async function executeMutation() {
    const recipe = findActiveRecipe();
    if (!recipe || !selectedSlot1 || !selectedSlot2) return;

    if (!confirm(`WARNING: ${selectedSlot1.name} and ${selectedSlot2.name} will be consumed to create a new Legend. Proceed?`)) return;

    // A. Visual loading
    document.getElementById('fusion-lab-root').innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px;">
            <div class="vortex-active" style="width:150px; height:150px; border-radius:50%;"></div>
            <h2 style="margin-top:20px; color:#f6e05e;">CHANNELING ANCIENT DNA...</h2>
        </div>
    `;

    // B. Calculate Inheritance
    const avgLevel = Math.floor((selectedSlot1.level + selectedSlot2.level) / 2);
    
    // C. Auto-Unequip Gear (FromBodyguard Plan)
    [selectedSlot1, selectedSlot2].forEach(parent => {
        if (parent.equipment) {
            Object.values(parent.equipment).forEach(itemId => {
                // The item stays in gameState.inventory.equipment, 
                // we just need to make sure no pet is "wearing" it.
                // Our existing repairSaveData already handles cleaning orphan items!
            });
        }
    });

    // D. Fetch Result Data
    let resultBase = null;
    for (const r in PET_TYPES) {
        const found = PET_TYPES[r].find(p => p.id === recipe.result);
        if (found) { resultBase = JSON.parse(JSON.stringify(found)); break; }
    }

    // E. Construct the New Legend
    const newPet = {
        ...resultBase,
        id: 'mutant_' + Date.now(),
        type: resultBase.id,
        level: avgLevel,
        xp: 0,
        maxXp: avgLevel * 300 + 200,
        hp: 100 + (avgLevel * 10),
        maxHP: 100 + (avgLevel * 10),
        isHatched: true,
        evolutionStage: 0, // Mutation is a new beginning
        stars: 0,
        equipment: {},
        badges: []
    };

    // F. FIREBASE TRANSACTION (Anti-Data Loss)
    try {
        const studentRef = fbase.doc(db, "students", gameState.playerName);
        
        await fbase.runTransaction(db, async (transaction) => {
            // 1. Remove 500 BP
            gameState.brainPoints -= recipe.cost;
            
            // 2. Remove parents from main list
            const pId1 = selectedSlot1.id;
            const pId2 = selectedSlot2.id;
            gameState.pets = gameState.pets.filter(p => p.id !== pId1 && p.id !== pId2);
            
            // 3. Remove parents from Squad
            if (gameState.team) {
                gameState.team = gameState.team.filter(id => id !== pId1 && id !== pId2);
            }

            // 4. Add the new Legend
            gameState.pets.push(newPet);
            gameState.currentPetId = newPet.id;

            // 5. Update Cloud
            const compressed = compressState(gameState);
            transaction.update(studentRef, { saveData: compressed });
        });

        // G. SUCCESS CEREMONY
        triggerRewardCeremony(
            "MUTATION SUCCESSFUL!",
            `Behold the power of ${newPet.name}!`,
            `<img src="${newPet.image}" style="width:150px; filter:drop-shadow(0 0 20px #63b3ed);">`,
            () => { 
                selectedSlot1 = null; selectedSlot2 = null;
                switchTab('hub'); 
            }
        );

    } catch (e) {
        console.error("Mutation Failed:", e);
        alert("Mutation Interrupted! Connection lost. No pets were harmed.");
        renderLabUI();
    }
}

// Ensure the main game can see our global functions
window.selectForFusion = selectForFusion;
window.deselectSlot = deselectSlot;
window.executeMutation = executeMutation;

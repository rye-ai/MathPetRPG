/* --- FUSION_JS_START --- */
let selectedSlot1 = null;
let selectedSlot2 = null;
let fusionRecipes = [];
let isFusing = false;

// Watch for the Fusion Tab
setInterval(() => {
    const root = document.getElementById('fusion-lab-root');
    if (!root) return;
    const isVisible = root.parentElement.classList.contains('active');
    if (isVisible && root.innerHTML.includes("Initializing")) {
        startFusionLab();
    }
}, 1000);

async function startFusionLab() {
    try {
        const res = await fetch(getGhUrl('pets/fusion_recipes.json'));
        fusionRecipes = await res.json();
        renderLabUI();
    } catch (e) {
        document.getElementById('fusion-lab-root').innerHTML = "Fusion Recipes Not Found.";
    }
}

function renderLabUI() {
    const root = document.getElementById('fusion-lab-root');
    if (!root || isFusing) return;

    const recipe = findActiveRecipe();
    const canFuse = recipe && gameState.brainPoints >= recipe.cost;
    
    root.innerHTML = `
        <div class="fusion-flash" id="lab-flash"></div>
        
        <div class="fusion-stage">
            <div class="lab-header">
                <h2 style="color:#63b3ed; text-shadow: 0 0 15px #000; font-weight:900; letter-spacing:2px; font-size:24px;">🧬 MUTATION CENTER</h2>
            </div>

            <!-- Slot A -->
            <div class="slot-a-pos" id="pod-a">
                ${selectedSlot1 
                    ? `<img src="${selectedSlot1.image}" class="fusion-pet-sprite ${selectedSlot1.imageStyle}" onclick="deselectSlot(1)">` 
                    : `<div class="fusion-empty-pod" onclick="showToast('Select a pet from the list!', 'info')">+</div>`}
            </div>

            <!-- Result/Vortex (NOW HIDING THE RESULT) -->
            <div class="vortex-pos">
                ${recipe ? `<div class="fusion-vortex vortex-active">${renderResultSilhouette(recipe)}</div>` : ''}
            </div>

            <!-- Slot B -->
            <div class="slot-b-pos" id="pod-b">
                ${selectedSlot2 
                    ? `<img src="${selectedSlot2.image}" class="fusion-pet-sprite flipped-sprite ${selectedSlot2.imageStyle}" onclick="deselectSlot(2)">` 
                    : `<div class="fusion-empty-pod" onclick="showToast('Select a pet from the list!', 'info')">+</div>`}
            </div>

            <div class="fusion-action-zone">
                ${recipe ? `<div class="fusion-price-tag">MUTATION COST: 🧠 ${recipe.cost} BP</div>` : ''}
                <br>
                <button class="gacha-btn" style="width:260px; font-size:18px; opacity:${canFuse?1:0.5}; box-shadow: 0 0 25px rgba(99, 179, 237, 0.4);" 
                    ${canFuse?'':'disabled'} onclick="executeMutation()">
                    ${canFuse ? '⚡ BEGIN FUSION ⚡' : 'INSUFFICIENT BP'}
                </button>
            </div>

            <div style="position:absolute; bottom:0; width:100%; padding:15px; background:linear-gradient(transparent, rgba(0,0,0,0.9)); pointer-events:auto;">
                <p style="font-size:11px; color:#63b3ed; margin-bottom:5px; font-weight:bold; text-shadow: 1px 1px 2px black;">ELIGIBLE CANDIDATES (EVO 3):</p>
                <div class="fusion-pet-list">${renderCandidateList()}</div>
            </div>
        </div>`;
}

function renderResultSilhouette(recipe) {
    if (!recipe) return "";
    
    // 🛡️ ARCHITECT FIX: We now show the Glowing Energy Sphere instead of the pet image.
    // This keeps the 55 unique hybrids a total surprise!
    return `<div class="energy-sphere">
                <div style="font-size:24px; font-weight:bold; color:white; text-shadow: 0 0 10px #000;">?</div>
            </div>`;
}

function renderCandidateList() {
    const candidates = gameState.pets.filter(p => p.isHatched && p.evolutionStage >= 2 && p.id !== selectedSlot1?.id && p.id !== selectedSlot2?.id);
    if (candidates.length === 0) return "<p style='font-size:11px; color:#718096; width:100%; text-align:center;'>No Evolution 3 pets available.</p>";
    return candidates.map(p => `
        <div class="pet-card" onclick="selectForFusion('${p.id}')" style="background: rgba(255,255,255,0.1); border: 1px solid #63b3ed; padding:5px;">
            <img src="${p.image}" style="width:35px; height:35px; object-fit:contain;">
            <div style="font-size:8px; color:white; font-weight:bold; overflow:hidden;">${p.name}</div>
        </div>`).join('');
}

function selectForFusion(id) {
    const p = gameState.pets.find(x => x.id === id);
    if (!selectedSlot1) selectedSlot1 = p; else if (!selectedSlot2) selectedSlot2 = p;
    renderLabUI();
}

function deselectSlot(n) {
    if (n === 1) selectedSlot1 = null; else selectedSlot2 = null;
    renderLabUI();
}

function findActiveRecipe() {
    if (!selectedSlot1 || !selectedSlot2) return null;
    const pair = [selectedSlot1.type, selectedSlot2.type].sort();
    return fusionRecipes.find(r => {
        const rP = [...r.parents].sort();
        return rP[0] === pair[0] && rP[1] === pair[1];
    });
}

async function executeMutation() {
    const recipe = findActiveRecipe();
    if (!recipe || isFusing) return;

    // 🛡️ ARCHITECT GUARD 1: Verify Result exists on GitHub before proceeding
    let resultBase = null;
    for (const r in PET_TYPES) {
        const found = PET_TYPES[r].find(p => p.id === recipe.result);
        if (found) { resultBase = JSON.parse(JSON.stringify(found)); break; }
    }

    if (!resultBase) {
        alert("🚨 DATA ERROR: The result ID '" + recipe.result + "' was not found in mutated_pets.json. Check your GitHub IDs! No pets were deleted.");
        return;
    }
    
    if (!confirm(`Warning: ${selectedSlot1.name} and ${selectedSlot2.name} will be consumed to create a Legend. Proceed?`)) return;

    isFusing = true;
    const podA = document.querySelector('#pod-a img');
    const podB = document.querySelector('#pod-b img');
    const flash = document.getElementById('lab-flash');
    const actionZone = document.querySelector('.fusion-action-zone');

    // 1. Energy Charge
    actionZone.style.opacity = '0';
    if(podA) podA.classList.add('charging');
    if(podB) podB.classList.add('charging-flipped');
    soundManager.playSFX('attack');
    
    await new Promise(r => setTimeout(r, 2000));

    // 2. Converge to center
    if(podA) {
        podA.classList.remove('charging');
        podA.parentElement.classList.add('flying-a');
    }
    if(podB) {
        podB.classList.remove('charging-flipped');
        podB.parentElement.classList.add('flying-b');
    }

    await new Promise(r => setTimeout(r, 800));

    // 3. The Nova Flash
    flash.classList.add('nova-active');
    soundManager.playSFX('gacha');

    // 🛡️ ARCHITECT GUARD 2: Unequip items automatically so they aren't lost
    [selectedSlot1, selectedSlot2].forEach(p => { p.equipment = {}; });

    // 4. Update Game State
    const avgLvl = Math.floor(((selectedSlot1.level || 1) + (selectedSlot2.level || 1)) / 2);
    const newPet = { 
        ...resultBase, 
        id: 'mutant_'+Date.now(), 
        level: avgLvl, 
        hp: 120+(avgLvl*10), 
        maxHP: 120+(avgLvl*10), 
        isHatched: true, 
        evolutionStage: 0, 
        stars: 0 
    };

    gameState.brainPoints -= recipe.cost;
    const id1 = selectedSlot1.id; 
    const id2 = selectedSlot2.id;
    
    // Safety filter to remove parents
    gameState.pets = gameState.pets.filter(p => p.id !== id1 && p.id !== id2);
    gameState.pets.push(newPet);
    gameState.currentPetId = newPet.id;
    
    saveGame(true);

    await new Promise(r => setTimeout(r, 500));

    // 5. Final Reward (THIS is where the pet is revealed!)
    triggerRewardCeremony(
        "LEGENDARY MUTATION COMPLETE!", 
        `The DNA has stabilized into ${newPet.name}!`, 
        `<img src="${newPet.image}" style="width:180px; filter:drop-shadow(0 0 30px gold);">`, 
        () => {
            isFusing = false;
            selectedSlot1 = null; 
            selectedSlot2 = null; 
            switchTab('hub');
        }
    );
}
/* --- FUSION_JS_END --- */


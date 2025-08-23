/* ==========================================================================
   Sorting Visualizer - full working JS

   Behavior: generate, input, bubble/selection/insertion/quick/merge sort
   ========================================================================== */

/* -------------------------
   Global state and settings
   ------------------------- */
let algoIndex = 0;                // 0: Bubble, 1: Selection, 2: Insertion, 3: Quick, 4: Merge
let isRunning = 0;                // 0 = idle, 1 = sorting
let animationDelay = 1600 / 1000; // seconds
let comparisonDelay = 400;        // ms
let wasResetClicked = false;      // whether reset was clicked during animations
let activeFirst = null;           // currently animating element index (first)
let activeLast = null;            // currently animating element index (second)

/* timing info (optional display if you add .time-taken) */
let sortStartTimestamp = null;
let lastSortDuration = 0;

/* colors used for highlights (easy to change) */
const COLOR_COMPARE = "#FFB6C1";  // compare highlight (light pink)
const COLOR_SWAP = "#F0E68C";     // swap highlight (khaki)
const COLOR_SORTED = "#90EE90";   // sorted (light green)
const COLOR_MOVE = "#FFFFA8";     // merge move (light yellow)
const COLOR_GLOW = "0 0 12px rgba(59,130,246,0.45)"; // glow effect for sorted

/* utility: safe query */
function q(sel) {
    return document.querySelector(sel);
}

/* Initialize any UI popups (semantic-ui / fomantic usage) */
$('.ui.icon').popup();
$('input[type=range]').popup();

/* -------------------------
   Range (speed) handler
   ------------------------- */
const rangeEl = q(".form-range");
if (rangeEl) {
    rangeEl.addEventListener("change", function (e) {
        // map slider value to delays (kept similar to original mapping but slightly adjusted)
        let v = parseInt(e.target.value);
        if (isNaN(v)) v = 3200;
        comparisonDelay = 1200 - 180 * (v / 800);   // ms for comparison highlight
        animationDelay = (4600 - v) / 1000;         // seconds for animation duration
        const speedSegment = q('.ui.segment.speed');
        if (speedSegment) {
            speedSegment.innerHTML = (v / 800) + 'x <small>(' + Math.round(animationDelay * 1000) + ' ms)</small>';
        }
    });
}

/* -------------------------
   Render / parse helpers
   ------------------------- */

/* Build bars from #input value (comma separated) */
function changeBlocks() {
    const inputVal = (q("#input") ? q("#input").value : "").trim();
    const numsContainer = q(".horzx .nums");
    if (!numsContainer) return;
    if (inputVal === "") {
        numsContainer.innerHTML = "";
        return;
    }
    const tokens = inputVal.split(",").map(s => s.trim()).filter(s => s !== "");
    let inner = "";
    for (let i = 0; i < tokens.length; i++) {
        inner += `<div class="sc-jRQAMF eRnhep" style="order: 0;" id="${i}">${tokens[i]}</div>\n`;
    }
    numsContainer.innerHTML = inner;
}

/* Parse #input live and update #size and bars
   Behavior: takes numeric tokens only, stops at first non-numeric */
function changeInput(e) {
    const target = e && e.target ? e.target : q("#input");
    if (!target) return;
    let k = target.value.trim();

    // remember if user typed trailing comma
    let trailingComma = 0;
    if (k.length > 0 && k.substring(k.length - 1) === ",") {
        k = k.substring(0, k.length - 1);
        trailingComma = 1;
    }

    // remove leading/trailing commas, extra whitespace
    k = k.replace(/^,+|,+$/g, '');
    if (k === "") {
        if (q("#size")) q("#size").value = 0;
        const cont = q(".horzx .nums");
        if (cont) cont.innerHTML = "";
        return;
    }

    const parts = k.split(",");
    let outHtml = "";
    let sanitized = "";
    let count = 0;
    for (let i = 0; i < parts.length; i++) {
        const token = parts[i].trim();
        if (token === "") break;
        // allow negative and positive integers, but ensure this is a number
        if (!isNaN(token)) {
            if (count === 0) sanitized = "" + token;
            else sanitized = sanitized + "," + token;
            outHtml += `<div class="sc-jRQAMF eRnhep" style="order: 0;" id="${count}">${token}</div>\n`;
            count++;
            if (q("#size")) q("#size").value = count;
        } else {
            // stop processing at first non-number
            break;
        }
    }

    if (trailingComma === 1) sanitized = sanitized + ",";
    if (q("#input")) q("#input").value = sanitized;
    if (q("#input") && q("#input").value === "") {
        if (q("#size")) q("#size").value = 0;
    }
    const numsContainer = q(".horzx .nums");
    if (numsContainer) numsContainer.innerHTML = outHtml;
}

/* -------------------------
   small promise sleep helper
   ------------------------- */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* -------------------------
   Comparison resolvers (returns Promise<boolean>)
   Highlights two elements, waits, then resolves with comparison result
   ------------------------- */

/* Bubble compare */
function bubbleCompareResolve(a, b) {
    return new Promise(resolve => {
        if (isRunning === 1 && algoIndex === 0 && wasResetClicked === false) {
            const elA = document.getElementById("" + a);
            const elB = document.getElementById("" + b);
            if (elA) elA.style.backgroundColor = COLOR_COMPARE;
            if (elB) elB.style.backgroundColor = COLOR_COMPARE;
            setTimeout(() => {
                if (elA) elA.style.backgroundColor = "white";
                if (elB) elB.style.backgroundColor = "white";
                const vA = parseInt(elA ? elA.innerHTML : "0");
                const vB = parseInt(elB ? elB.innerHTML : "0");
                resolve(vA > vB);
            }, comparisonDelay);
        } else {
            resolve(false);
        }
    });
}

/* Selection compare (is A < B) */
function selectionCompareResolve(a, b) {
    return new Promise(resolve => {
        if (isRunning === 1 && algoIndex === 1 && wasResetClicked === false) {
            const elA = document.getElementById("" + a);
            const elB = document.getElementById("" + b);
            if (elA) elA.style.backgroundColor = COLOR_COMPARE;
            if (elB) elB.style.backgroundColor = COLOR_COMPARE;
            setTimeout(() => {
                if (elA) elA.style.backgroundColor = "white";
                if (elB) elB.style.backgroundColor = "white";
                const vA = parseInt(elA ? elA.innerHTML : "0");
                const vB = parseInt(elB ? elB.innerHTML : "0");
                resolve(vA < vB);
            }, comparisonDelay);
        } else {
            resolve(false);
        }
    });
}

/* Insertion compare (is left > right?) */
function insertionCompareResolve(a, b) {
    return new Promise(resolve => {
        if (isRunning === 1 && algoIndex === 2 && wasResetClicked === false) {
            const elA = document.getElementById("" + a);
            const elB = document.getElementById("" + b);
            if (elA) elA.style.backgroundColor = COLOR_COMPARE;
            if (elB) elB.style.backgroundColor = COLOR_COMPARE;
            setTimeout(() => {
                if (elA) elA.style.backgroundColor = "white";
                if (elB) elB.style.backgroundColor = "white";
                const vA = parseInt(elA ? elA.innerHTML : "0");
                const vB = parseInt(elB ? elB.innerHTML : "0");
                resolve(vA > vB);
            }, comparisonDelay);
        } else {
            resolve(false);
        }
    });
}

/* Quick compare (is A < pivot?) */
function quickCompareResolve(a, b) {
    return new Promise(resolve => {
        if (isRunning === 1 && algoIndex === 3 && wasResetClicked === false) {
            const elA = document.getElementById("" + a);
            const elB = document.getElementById("" + b);
            if (elA) elA.style.backgroundColor = COLOR_COMPARE;
            if (elB) elB.style.backgroundColor = COLOR_COMPARE;
            setTimeout(() => {
                if (elA) elA.style.backgroundColor = "white";
                if (elB) elB.style.backgroundColor = "white";
                const vA = parseInt(elA ? elA.innerHTML : "0");
                const vB = parseInt(elB ? elB.innerHTML : "0");
                resolve(vA < vB);
            }, comparisonDelay);
        } else {
            resolve(false);
        }
    });
}

/* Merge compare (is left < right) with optional mid-awareness */
let mergeCheckIndex = null;
function mergeCompareResolve(a, b, mid) {
    return new Promise(resolve => {
        if (isRunning === 1 && algoIndex === 4 && wasResetClicked === false) {
            const elA = document.getElementById("" + a);
            const elB = document.getElementById("" + b);
            // remember sorted state
            let aWasSorted = (mergeCheckIndex === mid && elA && elA.style.backgroundColor === COLOR_SORTED) ? 1 : 0;
            let bWasSorted = (mergeCheckIndex === mid && elB && elB.style.backgroundColor === COLOR_SORTED) ? 1 : 0;
            if (elA) elA.style.backgroundColor = COLOR_COMPARE;
            if (elB) elB.style.backgroundColor = COLOR_COMPARE;
            setTimeout(() => {
                if (elA) elA.style.backgroundColor = aWasSorted ? COLOR_SORTED : "white";
                if (elB) elB.style.backgroundColor = bWasSorted ? COLOR_SORTED : "white";
                const vA = parseInt(elA ? elA.innerHTML : "0");
                const vB = parseInt(elB ? elB.innerHTML : "0");
                resolve(vA < vB);
            }, comparisonDelay);
        } else {
            resolve(false);
        }
    });
}

/* -------------------------
   Sorting routines
   ------------------------- */

/* Bubble Sort */
async function startBubbleSort() {
    sortStartTimestamp = Date.now();
    const numsContainer = q(".nums");
    if (!numsContainer) return;
    const n = numsContainer.children.length;

    for (let i = n - 1; i >= 0; i--) {
        for (let j = 0; j < i; j++) {
            if (!(isRunning === 1 && algoIndex === 0 && wasResetClicked === false)) return;
            // update comparisons
            const compsEl = q(".comparisons");
            compsEl.innerHTML = "" + (parseInt(compsEl.innerHTML) + 1);

            if (await bubbleCompareResolve(j, j + 1)) {
                activeFirst = j + 1;
                activeLast = j;

                // highlight swap pair
                const elA = document.getElementById("" + (j + 1));
                const elB = document.getElementById("" + j);
                if (elA) elA.style.backgroundColor = COLOR_SWAP;
                if (elB) elB.style.backgroundColor = COLOR_SWAP;

                // animate swap: slightly different pattern for uniqueness
                if (elB) elB.animate([
                    { transform: 'translate(0px,0px)' },
                    { transform: 'translate(0px,40px)' },
                    { transform: 'translate(40px,40px)' },
                    { transform: 'translate(40px,0px)' }
                ], { duration: animationDelay * 1000 });

                if (elA) elA.animate([
                    { transform: 'translate(0px,0px)' },
                    { transform: 'translate(0px,-40px)' },
                    { transform: 'translate(-40px,-40px)' },
                    { transform: 'translate(-40px,0px)' }
                ], { duration: animationDelay * 1000 });

                // after animation swap values
                setTimeout(() => {
                    if (!(isRunning === 1 && algoIndex === 0 && wasResetClicked === false)) return;
                    const swapsEl = q(".swaps");
                    swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);
                    const aVal = elA ? elA.innerHTML : "";
                    const bVal = elB ? elB.innerHTML : "";
                    if (elB) elB.innerHTML = aVal;
                    if (elA) elA.innerHTML = bVal;
                    if (elA) elA.style.backgroundColor = "white";
                    if (elB) elB.style.backgroundColor = "white";
                }, animationDelay * 1000);

                await sleep(animationDelay * 1000 + 200);
            }
        }
        // mark as sorted
        const finalEl = document.getElementById("" + i);
        if (finalEl) {
            finalEl.style.backgroundColor = COLOR_SORTED;
            finalEl.style.boxShadow = COLOR_GLOW;
        }
    }

    // display time taken if element available
    if (sortStartTimestamp) {
        lastSortDuration = Date.now() - sortStartTimestamp;
        const timeLabel = q(".time-taken");
        if (timeLabel) timeLabel.innerHTML = "Time: " + lastSortDuration + " ms";
    }
}

/* Selection Sort */
async function startSelectionSort() {
    sortStartTimestamp = Date.now();
    const numsContainer = q(".nums");
    if (!numsContainer) return;
    const n = numsContainer.children.length;

    for (let i = 0; i < n; i++) {
        if (!(isRunning === 1 && algoIndex === 1 && wasResetClicked === false)) return;
        let min_idx = i;

        if (i === n - 1) {
            const lastEl = document.getElementById("" + i);
            if (lastEl) {
                lastEl.style.backgroundColor = COLOR_SORTED;
                lastEl.style.boxShadow = COLOR_GLOW;
            }
        }

        for (let j = i + 1; j < n; j++) {
            if (!(isRunning === 1 && algoIndex === 1 && wasResetClicked === false)) return;
            const compsEl = q(".comparisons");
            compsEl.innerHTML = "" + (parseInt(compsEl.innerHTML) + 1);

            if (await selectionCompareResolve(j, min_idx)) {
                min_idx = j;
            }
        }

        if (min_idx !== i) {
            const elMin = document.getElementById("" + min_idx);
            const elI = document.getElementById("" + i);
            if (elMin) elMin.style.backgroundColor = COLOR_SWAP;
            if (elI) elI.style.backgroundColor = COLOR_SWAP;

            // animate
            if (elI) elI.animate([
                { transform: 'translate(0px,0px)' },
                { transform: 'translate(0px,45px)' },
                { transform: `translate(${(min_idx - i) * 42}px,45px)` },
                { transform: `translate(${(min_idx - i) * 42}px,0px)` }
            ], { duration: animationDelay * 1000 });

            if (elMin) elMin.animate([
                { transform: 'translate(0px,0px)' },
                { transform: 'translate(0px,-45px)' },
                { transform: `translate(${-1 * (min_idx - i) * 42}px,-45px)` },
                { transform: `translate(${-1 * (min_idx - i) * 42}px,0px)` }
            ], { duration: animationDelay * 1000 });

            setTimeout(() => {
                if (!(isRunning === 1 && algoIndex === 1 && wasResetClicked === false)) return;
                const swapsEl = q(".swaps");
                swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);
                const valMin = elMin ? elMin.innerHTML : "";
                const valI = elI ? elI.innerHTML : "";
                if (elI) elI.innerHTML = valMin;
                if (elMin) elMin.innerHTML = valI;

                if (elI) {
                    elI.style.backgroundColor = COLOR_SORTED;
                    elI.style.boxShadow = COLOR_GLOW;
                }
                if (elMin) elMin.style.backgroundColor = "white";
            }, animationDelay * 1000);

            await sleep(animationDelay * 1000 + 200);
        } else {
            // already in place
            const elI = document.getElementById("" + i);
            if (elI) {
                elI.style.backgroundColor = COLOR_SORTED;
                elI.style.boxShadow = COLOR_GLOW;
            }
        }
    }

    if (sortStartTimestamp) {
        lastSortDuration = Date.now() - sortStartTimestamp;
        const timeLabel = q(".time-taken");
        if (timeLabel) timeLabel.innerHTML = "Time: " + lastSortDuration + " ms";
    }
}

/* Insertion Sort */
async function startInsertionSort() {
    sortStartTimestamp = Date.now();
    const numsContainer = q(".nums");
    if (!numsContainer) return;
    const n = numsContainer.children.length;

    for (let i = 1; i < n; i++) {
        for (let j = i - 1; j >= 0 && await insertionCompareResolve(j, j + 1); j--) {
            if (!(isRunning === 1 && algoIndex === 2 && wasResetClicked === false)) return;

            const compsEl = q(".comparisons");
            compsEl.innerHTML = "" + (parseInt(compsEl.innerHTML) + 1);

            const elLeft = document.getElementById("" + j);
            const elRight = document.getElementById("" + (j + 1));
            if (elRight) elRight.style.backgroundColor = COLOR_SWAP;
            if (elLeft) elLeft.style.backgroundColor = COLOR_SWAP;

            if (elLeft) elLeft.animate([
                { transform: 'translate(0px,0px)' },
                { transform: 'translate(0px,45px)' },
                { transform: 'translate(45px,45px)' },
                { transform: 'translate(45px,0px)' }
            ], { duration: animationDelay * 1000 });

            if (elRight) elRight.animate([
                { transform: 'translate(0px,0px)' },
                { transform: 'translate(0px,-45px)' },
                { transform: 'translate(-45px,-45px)' },
                { transform: 'translate(-45px,0px)' }
            ], { duration: animationDelay * 1000 });

            setTimeout(() => {
                if (!(isRunning === 1 && algoIndex === 2 && wasResetClicked === false)) return;
                const swapsEl = q(".swaps");
                swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);
                const aVal = elRight ? elRight.innerHTML : "";
                const bVal = elLeft ? elLeft.innerHTML : "";
                if (elLeft) elLeft.innerHTML = aVal;
                if (elRight) elRight.innerHTML = bVal;
                if (elLeft) elLeft.style.backgroundColor = "white";
                if (elRight) elRight.style.backgroundColor = "white";
            }, animationDelay * 1000);

            await sleep(animationDelay * 1000 + 200);
        }

        // mark prefix [0..i] as sorted visually
        if (isRunning === 1 && algoIndex === 2 && wasResetClicked === false) {
            for (let k = i; k >= 0; k--) {
                let elK = document.getElementById("" + k);
                if (elK) {
                    elK.style.backgroundColor = COLOR_SORTED;
                    elK.style.boxShadow = COLOR_GLOW;
                }
            }
        }
    }

    if (sortStartTimestamp) {
        lastSortDuration = Date.now() - sortStartTimestamp;
        const timeLabel = q(".time-taken");
        if (timeLabel) timeLabel.innerHTML = "Time: " + lastSortDuration + " ms";
    }
}

/* Quick Sort: partition & recursion */
async function partition(low, high) {
    if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return low;
    let x = low - 1;
    for (let i = low; i < high; i++) {
        if (await quickCompareResolve(i, high)) {
            if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return x + 1;
            const compsEl = q(".comparisons");
            compsEl.innerHTML = "" + (parseInt(compsEl.innerHTML) + 1);

            x++;
            if (x != i) {
                const distance = (i - x) * 44;
                const rev = -distance;
                const elX = document.getElementById("" + x);
                const elI = document.getElementById("" + i);
                if (elX) elX.style.backgroundColor = COLOR_SWAP;
                if (elI) elI.style.backgroundColor = COLOR_SWAP;

                if (elX) elX.animate([
                    { transform: 'translate(0px,0px)' },
                    { transform: 'translate(0px,45px)' },
                    { transform: `translate(${distance}px,45px)` },
                    { transform: `translate(${distance}px,0px)` }
                ], { duration: animationDelay * 1000 });

                if (elI) elI.animate([
                    { transform: 'translate(0px,0px)' },
                    { transform: 'translate(0px,-45px)' },
                    { transform: `translate(${rev}px,-45px)` },
                    { transform: `translate(${rev}px,0px)` }
                ], { duration: animationDelay * 1000 });

                setTimeout(() => {
                    if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return;
                    const swapsEl = q(".swaps");
                    swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);
                    const tmpI = elI ? elI.innerHTML : "";
                    const tmpX = elX ? elX.innerHTML : "";
                    if (elX) elX.innerHTML = tmpI;
                    if (elI) elI.innerHTML = tmpX;
                    if (elX) elX.style.backgroundColor = "white";
                    if (elI) elI.style.backgroundColor = "white";
                }, animationDelay * 1000);

                await sleep(animationDelay * 1000 + 200);
            }
        }
    }

    if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return x + 1;

    // move pivot to correct position if needed
    if (high != (x + 1)) {
        const dist = (high - x - 1) * 44;
        const rev = -dist;
        const elLeft = document.getElementById("" + (x + 1));
        const elRight = document.getElementById("" + high);
        if (elLeft) elLeft.style.backgroundColor = COLOR_SWAP;
        if (elRight) elRight.style.backgroundColor = COLOR_SWAP;

        if (elLeft) elLeft.animate([
            { transform: 'translate(0px,0px)' },
            { transform: 'translate(0px,45px)' },
            { transform: `translate(${dist}px,45px)` },
            { transform: `translate(${dist}px,0px)` }
        ], { duration: animationDelay * 1000 });

        if (elRight) elRight.animate([
            { transform: 'translate(0px,0px)' },
            { transform: 'translate(0px,-45px)' },
            { transform: `translate(${rev}px,-45px)` },
            { transform: `translate(${rev}px,0px)` }
        ], { duration: animationDelay * 1000 });

        setTimeout(() => {
            if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return;
            const swapsEl = q(".swaps");
            swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);
            const a = elRight ? elRight.innerHTML : "";
            const b = elLeft ? elLeft.innerHTML : "";
            if (elLeft) elLeft.innerHTML = a;
            if (elRight) elRight.innerHTML = b;
            if (elLeft) elLeft.style.backgroundColor = COLOR_SORTED;
            if (elRight) elRight.style.backgroundColor = "white";
            if (elLeft) elLeft.style.boxShadow = COLOR_GLOW;
        }, animationDelay * 1000);

        await sleep(animationDelay * 1000 + 200);
    }

    const pivotEl = document.getElementById("" + (x + 1));
    if (pivotEl) {
        pivotEl.style.backgroundColor = COLOR_SORTED;
        pivotEl.style.boxShadow = COLOR_GLOW;
    }

    return x + 1;
}

async function startQuickSort(low, high) {
    if (!(isRunning === 1 && algoIndex === 3 && wasResetClicked === false)) return;
    if (low === high) {
        const el = document.getElementById("" + low);
        if (el) {
            el.style.backgroundColor = COLOR_SORTED;
            el.style.boxShadow = COLOR_GLOW;
        }
        return;
    }
    if (low < high) {
        let pivot = await partition(low, high);
        await startQuickSort(low, pivot - 1);
        await startQuickSort(pivot + 1, high);
    }
}

/* Merge sort methods */
async function merge(l, m, r) {
    if (!(isRunning === 1 && algoIndex === 4 && wasResetClicked === false)) return;

    for (let i = m + 1; i <= r; i++) {
        for (let j = l; j < i; j++) {
            if (await mergeCompareResolve(i, j, m)) {
                if (!(isRunning === 1 && algoIndex === 4 && wasResetClicked === false)) return;

                const compsEl = q(".comparisons");
                compsEl.innerHTML = "" + (parseInt(compsEl.innerHTML) + 1);

                const elI = document.getElementById("" + i);
                if (elI) elI.style.backgroundColor = COLOR_MOVE;

                const shift = (j - i) * 44;

                if (elI) elI.animate([
                    { transform: 'translate(0px,0px)' },
                    { transform: 'translate(0px,-40px)' },
                    { transform: `translate(${shift}px,-40px)` },
                    { transform: `translate(${shift}px,0px)` }
                ], { duration: animationDelay * 1000 });

                for (let k = j; k <= i - 1; k++) {
                    const elK = document.getElementById("" + k);
                    if (elK) {
                        elK.animate([
                            { transform: 'translate(0px,0px)' },
                            { transform: `translate(0px,0px)` },
                            { transform: `translate(44px,0px)` },
                            { transform: `translate(44px,0px)` }
                        ], { duration: animationDelay * 1000 });
                    }
                }

                // collect values and then reassign after animation
                let movedBlock = [];
                for (let ss = j; ss < i; ss++) {
                    const el = document.getElementById("" + ss);
                    movedBlock.push(el ? parseInt(el.innerHTML) : 0);
                }

                setTimeout(() => {
                    if (!(isRunning === 1 && algoIndex === 4 && wasResetClicked === false)) return;

                    const swapsEl = q(".swaps");
                    swapsEl.innerHTML = "" + (parseInt(swapsEl.innerHTML) + 1);

                    if (mergeCheckIndex === m) {
                        for (let x = 0; x < j; x++) {
                            const candidate = document.getElementById("" + x);
                            if (candidate) {
                                candidate.style.backgroundColor = COLOR_SORTED;
                                candidate.style.boxShadow = COLOR_GLOW;
                            }
                        }
                        const candidateJ = document.getElementById("" + j);
                        if (candidateJ) {
                            candidateJ.style.backgroundColor = COLOR_SORTED;
                            candidateJ.style.boxShadow = COLOR_GLOW;
                        }
                    } else {
                        const candidateJ = document.getElementById("" + j);
                        if (candidateJ) candidateJ.style.backgroundColor = "white";
                    }

                    if (elI) elI.style.backgroundColor = "white";

                    // move i -> j, and shift rest
                    const iVal = document.getElementById("" + i).innerHTML;
                    document.getElementById("" + j).innerHTML = iVal;
                    for (let zz = j + 1; zz <= i; zz++) {
                        const target = document.getElementById("" + zz);
                        if (target) target.innerHTML = movedBlock[zz - j - 1];
                    }
                }, animationDelay * 1000);

                await sleep(animationDelay * 1000);
                break;
            }
        }
    }

    if (mergeCheckIndex === m) {
        for (let ii = 0; ii < document.querySelector(".nums").children.length; ii++) {
            const el = document.getElementById("" + ii);
            if (el) {
                el.style.backgroundColor = COLOR_SORTED;
                el.style.boxShadow = COLOR_GLOW;
                await sleep(80);
            }
        }
    }
}

async function startMergeSort(l, r) {
    if (!(isRunning === 1 && algoIndex === 4 && wasResetClicked === false)) return;
    if (l >= r) return;
    const m = l + Math.floor((r - l) / 2);
    await startMergeSort(l, m);
    await startMergeSort(m + 1, r);
    await merge(l, m, r);
}

/* -------------------------
   UI Control bindings
   ------------------------- */

/* Play / start sorting */
$(".ui.icon.sort").on("click", function (e) {
    // show reset icon
    const resetIcon = q(".ui.icon.reset");
    if (resetIcon) {
        resetIcon.style.opacity = "1";
        resetIcon.style.display = "inline-block";
    }
    const redoIcon = q(".redo.icon");
    if (redoIcon) redoIcon.style.display = "inline-block";

    isRunning = 1;
    wasResetClicked = false;

    // set size from input
    const inputVal = (q("#input") ? q("#input").value.replace(/^,+|,+$/g, '') : "");
    if (!inputVal) {
        if (q("#size")) q("#size").value = "0";
    } else {
        if (q("#size")) q("#size").value = "" + inputVal.split(",").length;
    }

    if (q("#size")) q("#size").readOnly = true;
    if (q("#input")) q("#input").readOnly = true;

    // hide play icon (container)
    const playContainer = q(".ui.icon.sort");
    if (playContainer) playContainer.style.display = "none";

    // start timer
    sortStartTimestamp = Date.now();

    // start chosen algorithm
    const tokens = (q("#input") ? q("#input").value.replace(/^,+|,+$/g, '').split(",") : []);
    const n = tokens.length;
    switch (algoIndex) {
        case 0:
            startBubbleSort();
            break;
        case 1:
            startSelectionSort();
            break;
        case 2:
            startInsertionSort();
            break;
        case 3:
            if (n > 0) startQuickSort(0, n - 1);
            break;
        case 4:
            if (n > 0) {
                // compute a mid-check index for merge final marking
                mergeCheckIndex = Math.floor((n - 1) / 2);
                startMergeSort(0, n - 1);
            }
            break;
        default:
            startBubbleSort();
            break;
    }
});

/* Reset handler */
$(".ui.icon.reset").on("click", async function (e) {
    if (isRunning === 1) {
        this.style.opacity = "0.3";
        wasResetClicked = true;

        alert(`Please wait ${Math.ceil(animationDelay)} sec for animations to finish.`);

        await sleep(animationDelay * 1000);

        isRunning = 0;

        // clear any active animations (jquery stop used previously)
        if (activeFirst !== null) {
            $("#" + activeFirst).stop(true);
            const elF = document.getElementById("" + activeFirst);
            if (elF) elF.style.backgroundColor = "white";
            activeFirst = null;
        }
        if (activeLast !== null) {
            $("#" + activeLast).stop(true);
            const elL = document.getElementById("" + activeLast);
            if (elL) elL.style.backgroundColor = "white";
            activeLast = null;
        }

        // re-render bars from input
        changeInput({ target: q("#input") });

        // reset metrics
        if (q(".swaps")) q(".swaps").innerHTML = "0";
        if (q(".comparisons")) q(".comparisons").innerHTML = "0";

        if (q("#size")) q("#size").readOnly = false;
        if (q("#input")) q("#input").readOnly = false;

        // hide reset, show play
        const resetEl = q(".ui.icon.reset");
        if (resetEl) resetEl.style.display = "none";
        const playEl = q(".ui.icon.sort");
        if (playEl) playEl.style.display = "inline-block";
        const playIcon = q(".play.icon");
        if (playIcon) playIcon.style.display = "inline-block";

        // clear glow styles
        const all = document.querySelectorAll(".nums > div");
        all.forEach(n => {
            if (n) {
                n.style.boxShadow = "";
            }
        });
    }
});

/* Hide/show algorithm info panels */
function makeInvisibleAll() {
    ["#Selection", "#Insertion", "#Quick", "#Merge", "#Bubble"].forEach(id => {
        const el = q(id);
        if (el) el.style.display = "none";
    });
}

/* Document ready / initial setup */
$(document).ready(function () {
    // default array for demonstration
    if (q("#input")) q("#input").value = "15,14,13,12,11,10,9,8,7,6,5,4,3,2,1";
    changeInput({ target: q("#input") });

    // init accordion (semantic)
    $('.ui.accordion').accordion();

    // show bubble details initially
    makeInvisibleAll();
    if (q("#Bubble")) q("#Bubble").style.display = "initial";
    const bubbleMenu = document.querySelector(".Bubble");
    if (bubbleMenu) bubbleMenu.classList.add("active");

    // attach menu click handlers
    const menuItems = document.querySelectorAll("a.item");
    for (let i = 0; i < menuItems.length; i++) {
        menuItems[i].addEventListener("click", function () {
            makeInvisibleAll();
            const sel = `#${this.classList[1]}`;
            if (q(sel)) q(sel).style.display = "initial";

            // reset state
            algoIndex = i;
            wasResetClicked = false;
            isRunning = 0;

            if (activeFirst !== null) {
                $("#" + activeFirst).stop(true);
                const af = document.getElementById("" + activeFirst);
                if (af) af.style.backgroundColor = "white";
                activeFirst = null;
            }
            if (activeLast !== null) {
                $("#" + activeLast).stop(true);
                const al = document.getElementById("" + activeLast);
                if (al) al.style.backgroundColor = "white";
                activeLast = null;
            }

            // ensure play button visible, reset hidden
            if (q(".ui.icon.sort")) q(".ui.icon.sort").style.display = "inline-block";
            if (q(".play.icon")) q(".play.icon").style.display = "inline-block";
            if (q(".ui.icon.reset")) q(".ui.icon.reset").style.display = "none";

            // enable editing again
            if (q("#size")) q("#size").readOnly = false;
            if (q("#input")) q("#input").readOnly = false;

            // reset metrics
            if (q(".swaps")) q(".swaps").innerHTML = "0";
            if (q(".comparisons")) q(".comparisons").innerHTML = "0";

            // rebuild bars
            changeInput({ target: q("#input") });
        });
    }

    // random button -> generate array
    $('#random').on('click', function () {
        if (isRunning == 0) {
            let a = q("#size") ? q("#size").value : "";
            if (a < 0) {
                alert("Only positive values are allowed !!");
                if (q("#size")) q("#size").value = 0;
                return;
            }
            if (a === "") {
                alert("Size Required !! ");
            } else {
                a = "" + a;
                if (a.indexOf(".") !== -1) {
                    alert("Only Integer Values Are Allowed !!");
                } else {
                    a = parseInt(a);
                    let z = "";
                    for (let i = 0; i < a - 1; i++) {
                        z += Math.floor(100 + Math.random() * 900) + ",";
                    }
                    if (a !== 0) z += Math.floor(100 + Math.random() * 900);
                    if (q("#input")) q("#input").value = z;
                    if (a !== 0) changeBlocks();
                }
            }
        }
    });

    // bind input event
    $("#input").on("input", changeInput);

    // initial speed label
    const speedSegment = q('.ui.segment.speed');
    if (speedSegment && q(".form-range")) {
        speedSegment.innerHTML = (parseInt(q(".form-range").value) / 800) + 'x';
    }

});

/* Menu active state visual */
$('.ui.menu a.item').on('click', function () {
    $(this).addClass('active').siblings().removeClass('active');
});



/* get current numeric array from input */
function getCurrentArray() {
    const raw = q("#input") ? q("#input").value.replace(/^,+|,+$/g, '') : "";
    if (!raw) return [];
    return raw.split(",").map(x => parseInt(x));
}

/* stop and clear any running animations on the bars */
function stopAndClearAnimations() {
    const nodes = document.querySelectorAll(".nums > div");
    nodes.forEach(n => {
        try {
            if (n.getAnimations) {
                n.getAnimations().forEach(a => a.cancel());
            }
        } catch (err) {
            // ignore
        }
        n.style.transform = "";
        n.style.backgroundColor = "white";
        n.style.boxShadow = "";
    });
}

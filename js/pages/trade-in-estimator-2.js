// Production Analytical Dataset Matrix Object
        const deviceMatrix = [
            { id: "iphone-11", name: "iPhone 11", maxTradeInValue: 150, screenDeductions: { excellent: 0, scratched: 0, cracked: 35 } },
            { id: "iphone-11-pro", name: "iPhone 11 Pro", maxTradeInValue: 120, screenDeductions: { excellent: 0, scratched: 0, cracked: 45 } },
            { id: "iphone-11-pro-max", name: "iPhone 11 Pro Max", maxTradeInValue: 140, screenDeductions: { excellent: 0, scratched: 0, cracked: 50 } },
            { id: "iphone-12", name: "iPhone 12", maxTradeInValue: 150, screenDeductions: { excellent: 0, scratched: 20, cracked: 35 } },
            { id: "iphone-12-pro", name: "iPhone 12 Pro", maxTradeInValue: 160, screenDeductions: { excellent: 0, scratched: 20, cracked: 55 } },
            { id: "iphone-12-pro-max", name: "iPhone 12 Pro Max", maxTradeInValue: 250, screenDeductions: { excellent: 0, scratched: 20, cracked: 80 } },
            { id: "iphone-13", name: "iPhone 13", maxTradeInValue: 300, screenDeductions: { excellent: 0, scratched: 0, cracked: 75 } },
            { id: "iphone-13-pro", name: "iPhone 13 Pro", maxTradeInValue: 320, screenDeductions: { excellent: 0, scratched: 0, cracked: 100 } },
            { id: "iphone-13-pro-max", name: "iPhone 13 Pro Max", maxTradeInValue: 350, screenDeductions: { excellent: 0, scratched: 50, cracked: 100 } },
            { id: "iphone-14", name: "iPhone 14", maxTradeInValue: 370, screenDeductions: { excellent: 0, scratched: 0, cracked: 100 } },
            { id: "iphone-14-pro", name: "iPhone 14 Pro", maxTradeInValue: 390, screenDeductions: { excellent: 0, scratched: 0, cracked: 100 } },
            { id: "iphone-14-pro-max", name: "iPhone 14 Pro Max", maxTradeInValue: 400, screenDeductions: { excellent: 0, scratched: 0, cracked: 150 } },
            { id: "iphone-15", name: "iPhone 15", maxTradeInValue: 400, screenDeductions: { excellent: 0, scratched: 0, cracked: 150 } },
            { id: "iphone-15-pro", name: "iPhone 15 Pro", maxTradeInValue: 480, screenDeductions: { excellent: 0, scratched: 50, cracked: 150 } },
            { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", maxTradeInValue: 550, screenDeductions: { excellent: 0, scratched: 60, cracked: 200 } },
            { id: "iphone-16", name: "iPhone 16", maxTradeInValue: 650, screenDeductions: { excellent: 0, scratched: 50, cracked: 250 } },
            { id: "iphone-16-pro-max", name: "iPhone 16 Pro Max", maxTradeInValue: 750, screenDeductions: { excellent: 0, scratched: 100, cracked: 300 } }
        ];

        // Global Static Penalty Dictionaries
        const staticPenalties = {
            battery: { "90_plus": 0, "85_89": 20, "80_84": 25, below_80: 50 },
            faceId: { working: 0, not_working: 50 },
            backGlass: { good: 0, scratched: 20, cracked: 50 },
            camera: { fully_working: 0, minor_issue: 20, major_issue: 50 }
        };

        // Active Application State Engine Controls
        let activeSelections = {
            screen: "excellent",
            backGlass: "good",
            camera: "fully_working",
            faceId: "true"
        };

        // Initialize Selection Dropdowns Matrix View Nodes on Load
        document.addEventListener("DOMContentLoaded", function() {
            const selectElement = document.getElementById("deviceModel");
            deviceMatrix.forEach(device => {
                let opt = document.createElement("option");
                opt.value = device.id;
                opt.textContent = device.name;
                if(device.id === "iphone-13") opt.selected = true; // Match Next.js chunk standard baseline initialization
                selectElement.appendChild(opt);
            });
            runEvaluationEngine();
        });

        // Mutate Active Options Selection State Group Parameters
        function setConditionOption(groupKey, targetBtn) {
            const parentGrid = targetBtn.parentElement;
            const contextButtons = parentGrid.querySelectorAll(".option-btn");
            
            contextButtons.forEach(btn => {
                btn.classList.remove("active");
                const checkNode = btn.querySelector(".option-check");
                if (checkNode) checkNode.innerHTML = "";
            });

            targetBtn.classList.add("active");
            const structuralCheck = targetBtn.querySelector(".option-check");
            if (structuralCheck) structuralCheck.innerHTML = "&#10003;";

            activeSelections[groupKey] = targetBtn.getAttribute("data-value");
            runEvaluationEngine();
        }

        // Main Synchronous Calculation Engine Loop Execution Pipeline
        function runEvaluationEngine() {
            const currentModelId = document.getElementById("deviceModel").value;
            const targetDevice = deviceMatrix.find(d => d.id === currentModelId);
            if (!targetDevice) return;
            
            // 1. Resolve Current Battery State Multipliers
            const batteryPct = parseInt(document.getElementById("batteryHealth").value, 10);
            document.getElementById("batteryPercentBadge").textContent = batteryPct + "%";
            
            let batteryPenalty = 0;
            let batteryLabel = "";
            let batteryStyle = "";

            if (batteryPct >= 90) {
                batteryPenalty = staticPenalties.battery["90_plus"];
                batteryLabel = "Strong battery health";
                batteryStyle = "background-color: rgba(52, 199, 89, 0.15); color: var(--color-success);";
            } else if (batteryPct >= 85) {
                batteryPenalty = staticPenalties.battery["85_89"];
                batteryLabel = "Moderate battery health";
                batteryStyle = "background-color: rgba(0, 102, 204, 0.15); color: var(--color-warning);";
            } else if (batteryPct >= 80) {
                batteryPenalty = staticPenalties.battery["80_84"];
                batteryLabel = "Moderate battery health";
                batteryStyle = "background-color: rgba(0, 102, 204, 0.15); color: var(--color-warning);";
            } else {
                batteryPenalty = staticPenalties.battery["below_80"];
                batteryLabel = "Low battery health";
                batteryStyle = "background-color: rgba(255, 59, 48, 0.15); color: var(--color-error);";
            }

            const badgeElement = document.getElementById("batteryPercentBadge");
            badgeElement.style.cssText = batteryStyle;
            document.getElementById("batteryStatusLabel").textContent = batteryLabel;

            // 2. Resolve Component Deductions Fractions
            const screenPenalty = targetDevice.screenDeductions[activeSelections.screen];
            const backGlassPenalty = staticPenalties.backGlass[activeSelections.backGlass];
            const cameraPenalty = staticPenalties.camera[activeSelections.camera];
            const faceIdPenalty = (activeSelections.faceId === "true") ? staticPenalties.faceId.working : staticPenalties.faceId.not_working;

            // 3. Compute Subtotal Metrics via Subtractive Reduction Loop Model
            const rawSubtotal = targetDevice.maxTradeInValue - (batteryPenalty + screenPenalty + backGlassPenalty + cameraPenalty + faceIdPenalty);
            
            // 4. Force Absolute Floor Constraints & Apply Step 5 Interval Modulo Rounding Rules
            const finalPWAValue = 5 * Math.round(Math.max(rawSubtotal, 0) / 5);

            // 5. Update Structural DOM View Metrics Elements
            document.getElementById("summaryModelName").textContent = targetDevice.name + " max trade-in value";
            document.getElementById("summaryBasePrice").textContent = "$" + targetDevice.maxTradeInValue;
            
            document.getElementById("summaryBatteryDeduction").textContent = "-$" + batteryPenalty;
            document.getElementById("rowBatteryDeduction").style.display = batteryPenalty === 0 ? "none" : "flex";

            document.getElementById("summaryScreenDeduction").textContent = "-$" + screenPenalty;
            document.getElementById("rowScreenDeduction").style.display = screenPenalty === 0 ? "none" : "flex";

            document.getElementById("summaryBackGlassDeduction").textContent = "-$" + backGlassPenalty;
            document.getElementById("rowBackGlassDeduction").style.display = backGlassPenalty === 0 ? "none" : "flex";

            document.getElementById("summaryCameraDeduction").textContent = "-$" + cameraPenalty;
            document.getElementById("rowCameraDeduction").style.display = cameraPenalty === 0 ? "none" : "flex";

            document.getElementById("summaryFaceIdDeduction").textContent = "-$" + faceIdPenalty;
            document.getElementById("rowFaceIdDeduction").style.display = faceIdPenalty === 0 ? "none" : "flex";

            document.getElementById("summaryFinalTotal").textContent = "$" + finalPWAValue;
        }

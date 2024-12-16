const fullscreenButton = document.getElementById("fullscreenButton");
const field = document.getElementById("field");
const column = document.getElementById("column");
const output = document.getElementById("output");
let draggedElement = null;
let connectionDotsArr = [];
let shapes = [];
let values = [];
let diamonds = [];
let diamondId = 1;
let dotId = 1;
let debugMode = false;
let stopPlay = false;
let playStarted = false;
let debugCounter = 1;
let currentResolveFunc = null;
let currentRejectFunc = null;
let prevNode = null;
let currentNode = null;
let nextStepAllowed = true;

class Value {
	constructor(name, value) {
		this.name = name;
		this.value = value;
	}
}

// Fullscreen logic
fullscreenButton.addEventListener("click", () => {
    if (fullscreenButton.children[0].innerHTML === "fullscreen") {
        document.documentElement.requestFullscreen()
        fullscreenButton.children[0].innerHTML = "fullscreen_exit"
        changeWidthDependFullscreenMode("on")
    } else {
        document.exitFullscreen()
        fullscreenButton.children[0].innerHTML = "fullscreen"
        changeWidthDependFullscreenMode("off")
    }
})

document.addEventListener('fullscreenchange', exitFullscreen, false)

function exitFullscreen() {
    if (document.fullscreenElement === null) {
        fullscreenButton.children[0].innerHTML = "fullscreen"
        changeWidthDependFullscreenMode("off")
    }
}

function changeWidthDependFullscreenMode(mode) {
    if (mode === "on")
        document.body.setAttribute("style", "max-width: 100%;")
    if (mode === "off")
        document.body.setAttribute("style", "max-width: 1650px;")
}

function intiDefaultShapes() {
	shapes = [document.getElementById("start"), document.getElementById("end")];
	const line = field.querySelectorAll(".connection-line")[0];
	addConnectionDot(line, 0);
}

function addConnectionLine(shape, index) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.classList.add("connection-line");

	const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
	arrow.setAttribute("x1", "50%");
	arrow.setAttribute("y1", "0");
	arrow.setAttribute("x2", "50%");
	arrow.setAttribute("y2", "100%");	
	arrow.setAttribute("stroke", "rgb(120, 120, 120)");
	arrow.setAttribute("stroke-width", "2");
	arrow.setAttribute("marker-end", "url(#arrowhead)");

	svg.appendChild(arrow);
	addConnectionDot(svg, index);
	field.insertBefore(svg, shape);
}

function addConnectionDot(line, index) {
	const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
	foreignObject.setAttribute('width', '40px');
	foreignObject.setAttribute('height', '40px');
	const xValue = (parseFloat(foreignObject.getAttribute('x')) || 50) - 13.2;
	foreignObject.setAttribute('x', `${xValue}%`);
	foreignObject.setAttribute('y', "27%");
	
	const dotArea = document.createElement("div");
	dotArea.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dotArea.classList.add("connection-area");	

	connectionDotsArr.splice(index, 0, dotArea);
	foreignObject.appendChild(dotArea);

	const dot = document.createElement("div");
	dot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dot.setAttribute("id", `dot-${dotId++}`);
	dot.classList.add("connection-dot");
	dotArea.appendChild(dot);

	line.appendChild(foreignObject);

	// Highlight dot on dragover
	dotArea.addEventListener("dragover", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "0 0 10px blue";
	});

	// Remove shadow on dragleave
	dotArea.addEventListener("dragleave", (event) => {
		if (!dotArea.contains(event.relatedTarget)) {
			event.preventDefault();
			dot.style.boxShadow = "none";
		}
	});

	// Drop logic for dots
	dotArea.addEventListener("drop", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "none";	
		if (draggedElement) addShape(draggedElement, connectionDotsArr.indexOf(dotArea));
	});
}

function addShape(newShape, index) {
	const shape = newShape.cloneNode(true);

	let indexOfTheFollowingShape = (index + 1) * 2;

	if (shape.classList.contains("draggable")) shape.classList.remove("draggable");
	if (shape.getAttribute("draggable")) shape.removeAttribute("draggable");
	
	if (shape.classList.contains("diamond-wrapper")) handleDiamond(shape);
	else if (shape.getAttribute("data-id") === "set-value") addInputs(shape, newShape.getBoundingClientRect().width, newShape.getBoundingClientRect().height);
	else addInput(shape, newShape.getBoundingClientRect().width, newShape.getBoundingClientRect().height, newShape.getAttribute("data-id"));

	const followingShape = field.children[indexOfTheFollowingShape];
	field.insertBefore(shape, followingShape);
	addConnectionLine(followingShape, index + 1);
}

function addShapeToDiamond(newShape, index) {
	console.log(index);
	const shape = newShape.cloneNode(true);

	if(index == 1) {
		shape.style.marginLeft = "-250px";
	}
	else {
		shape.style.marginRigth = "50px";
	}

	if (shape.classList.contains("draggable")) shape.classList.remove("draggable");
	if (shape.getAttribute("draggable")) shape.removeAttribute("draggable");

	if (shape.classList.contains("diamond-wrapper")) handleDiamond(shape);
	else if (shape.getAttribute("data-id") === "set-value") addInputs(shape, newShape.getBoundingClientRect().width, newShape.getBoundingClientRect().height);
	else addInput(shape, newShape.getBoundingClientRect().width, newShape.getBoundingClientRect().height, newShape.getAttribute("data-id"));

	const followingShape = field.children[4];
	field.insertBefore(shape, followingShape);
	addConnectionLine(followingShape, index + 1);
}

// Enable dragging for shapes in the column
document.querySelectorAll(".draggable").forEach((el) => {
	el.setAttribute("draggable", true);

	el.addEventListener("dragstart", (event) => {
		terminateDebug();
		draggedElement = event.target;

		// Show connection dots dynamically when dragging starts
		const dots = field.querySelectorAll('.connection-dot');
			dots.forEach(dot => {
				dot.classList.add('visible');
			});
	});

	el.addEventListener("dragend", () => {
		draggedElement = null;

		// Hide connection dots when dragging ends
		const dots = field.querySelectorAll('.connection-dot');
		dots.forEach(dot => {
			dot.classList.remove('visible');
		});
	});
});

// Initial drawing
intiDefaultShapes();

function addInput(shape, originWidth, originHeight, type) {
	const input = document.createElement("textarea");
	let placeholderText = shape.children[0].innerText.trim();
	input.classList.add("block-input");
	let prefixWord = "";
	let valueToIncreaseWidth = 14;
	let increaseStep = 10.8;
	let maxCharsInBlock = 101;
	let prevInput = input.value;
	let lastModifyedChar = "";
	let setNewLineChar = false;
	let changedStyles = false;

	shape.style.width = originWidth + "px";

	switch(type) {
		case "text-block":
			placeholderText = "Введіть текст";
			break;
		case "input-value":
			changedStyles = true;
			maxCharsInBlock = 20;
			valueToIncreaseWidth = 10;
			increaseStep = 13;
			input.style.width = "85%";
			input.style.height = "85%";
			input.style.transform = "skew(20deg)";
			input.style.paddingTop = "10px";
			placeholderText = "Введіть значення";
			prefixWord = "Ввести ";
			break;
		case "output-value":
			changedStyles = true;
			maxCharsInBlock = 20;
			valueToIncreaseWidth = 10;
			increaseStep = 13;
			input.style.width = "85%";
			input.style.height = "85%";
			input.style.transform = "skew(20deg)";
			input.style.paddingTop = "10px";
			placeholderText = "Введіть значення";
			prefixWord = "Вивести "
		default:
			break;
	}

	input.setAttribute("placeholder", placeholderText);

	input.addEventListener('input', () => {
		const textLength = input.value.length;

		if(typeRestriction(input, type)) {
			return;
		}

		if (textLength > maxCharsInBlock) {
			input.value = input.value.slice(0, maxCharsInBlock);
			return;
		}

		if(changedStyles && textLength > valueToIncreaseWidth) {
			increaseStep = 10;	
		}
		else if(changedStyles) {
			increaseStep = 14;
		}

		if (textLength >= valueToIncreaseWidth - 1 && !input.value.includes("\n")) {
			if (prevInput.length < textLength) {
				shape.style.width = (Number(shape.style.width.split("p")[0]) + increaseStep) + "px";
			}
			else {
				shape.style.width = (Number(shape.style.width.split("p")[0]) - increaseStep) + "px";
			}
		}
		else if (textLength <= 57 && textLength >= valueToIncreaseWidth - 1) {
			if (prevInput.length < textLength) {
				shape.style.width = (Number(shape.style.width.split("p")[0]) + increaseStep) + "px";
			}
			else {
				shape.style.width = (Number(shape.style.width.split("p")[0]) - increaseStep) + "px";
			}
			shape.style.height = "75px";
		}

		if (textLength > 0) {
			if (textLength < prevInput.length) {
				lastModifyedChar = prevInput.charAt(prevInput.length - 1);
				prevInput = input.value;
			}
			else {
				prevInput = input.value;
				if(!setNewLineChar) {
					lastModifyedChar = input.value.charAt(input.value.length - 1);
				}
				else {
					setNewLineChar = false;
				}
			}
		}

		if (textLength > 56 && !input.value.includes("\n") && lastModifyedChar != "\n"
			&& input.value.charAt(input.value.length - 1) != '\n') {
			input.value = input.value.slice(0, 58).concat("\n", input.value.slice(58));
			lastModifyedChar = "\n";
			setNewLineChar = true;
			shape.style.height = "95px";
		}
		else if (textLength <= 58 && lastModifyedChar == "\n") {
			input.value = input.value.replace("\n", "");
			shape.style.height = "75px";
		}
	});
	
	input.addEventListener('focus', () => {
		terminateDebug();
		input.setAttribute("placeholder", "");
		if(changedStyles && input.style.paddingTop != "20px") {
			input.style.paddingTop = "20px";
		}

		if(input.value.includes(prefixWord) && changedStyles) {
			input.value = input.value.replace(prefixWord, "");
			shape.style.width = (Number(shape.style.width.split("p")[0]) - prefixWord.length * 10.8) + "px";
		}
    });

	input.addEventListener('blur', () => {
		if (input.value.length == 0) {
			input.setAttribute("placeholder", placeholderText);
			input.value = input.value.replace("\n", "");
			shape.style.height = originHeight + "px";
			shape.style.width = originWidth + "px";

			if(changedStyles && input.style.paddingTop != "10px") {
				input.style.paddingTop = "10px";
			}
		}
		else if(!input.value.includes(prefixWord) && changedStyles) {
			input.value = prefixWord + input.value;
			shape.style.width = (Number(shape.style.width.split("p")[0]) + prefixWord.length * 10.8) + "px";
		}
	});

	shape.innerHTML = "";
	shape.appendChild(input);
}

function addInputs(shape, originWidth, originHeight) {
	shape.children[0].remove();
	shape.style.width = originWidth + "px";
	shape.style.height = originHeight + "px";
	const span = document.createElement("span");
	span.innerText = "=";
	span.classList.add("big-text");
	span.style.margin = "0 5px";
	const firstInput = document.createElement("input");
	const secondIput = document.createElement("input");

	firstInput.classList.add("set-value-input");
	firstInput.style.minWidth = "40%";
	secondIput.classList.add("set-value-input");
	secondIput.style.minWidth = "40%";
	let increaseStep = 30.8;
	let maxCharsInBlock = 15;
	let lastModifyedCharInFirstInput = "";
	let lastModifyedCharInSecondInput = "";
	let lastInputLengthInFirstInput = 0;
	let lastInputLengthInSecondInput = 0;
	firstInput.setAttribute("placeholder", "A");
	secondIput.setAttribute("placeholder", "B");

	firstInput.addEventListener('input', () => {
		lastModifyedCharInFirstInput = firstInput.value.charAt(firstInput.value.length - 1);
		const textLength = firstInput.value.length;
		if(!(/[a-zA-Z]/.test(lastModifyedCharInFirstInput))) {
			firstInput.value = firstInput.value.slice(0, -1);
			return;
		}

		if (textLength > maxCharsInBlock) {
			firstInput.value = firstInput.value.slice(0, maxCharsInBlock);
			return;
		}

		if (textLength >= 2) {
			if(lastInputLengthInFirstInput <= textLength) {
				firstInput.style.minWidth = (Number(firstInput.style.minWidth.split("%")[0]) + 2) + "%";
				secondIput.style.minWidth = (Number(secondIput.style.minWidth.split("%")[0]) - 2) + "%";
				shape.style.width = (Number(shape.style.width.split("p")[0]) + (increaseStep / 2)) + "px";
			}
			else if(lastInputLengthInFirstInput > textLength) {
				firstInput.style.minWidth = (Number(firstInput.style.minWidth.split("%")[0]) - 2) + "%";
				secondIput.style.minWidth = (Number(secondIput.style.minWidth.split("%")[0]) + 2) + "%";
				shape.style.width = (Number(shape.style.width.split("p")[0]) - (increaseStep / 2)) + "px";
			}
		}

		lastInputLengthInFirstInput = textLength;
	});

	secondIput.addEventListener('input', () => {
		lastModifyedCharInSecondInput = secondIput.value.charAt(secondIput.value.length - 1);
		const textLength = secondIput.value.length;
		if(!(/[a-zA-Z0-9+\-*/()]/.test(lastModifyedCharInSecondInput))) {
			secondIput.value = secondIput.value.slice(0, -1);
			return;
		}

		if (textLength > maxCharsInBlock) {
			secondIput.value = secondIput.value.slice(0, maxCharsInBlock);
			return;
		}

		if (textLength >= 2) {
			if(lastInputLengthInSecondInput <= textLength) {
				firstInput.style.minWidth = (Number(firstInput.style.minWidth.split("%")[0]) - 2) + "%";
				secondIput.style.minWidth = (Number(secondIput.style.minWidth.split("%")[0]) + 2) + "%";
				shape.style.width = (Number(shape.style.width.split("p")[0]) + (increaseStep / 2)) + "px";
			}
			else if(lastInputLengthInSecondInput > textLength) {
				firstInput.style.minWidth = (Number(firstInput.style.minWidth.split("%")[0]) + 2) + "%";
				secondIput.style.minWidth = (Number(secondIput.style.minWidth.split("%")[0]) - 2) + "%";
				shape.style.width = (Number(shape.style.width.split("p")[0]) - (increaseStep / 2)) + "px";
			}
		}

		lastInputLengthInSecondInput = textLength;
	});

	firstInput.addEventListener('focus', () => terminateDebug());
	secondIput.addEventListener('focus', () => terminateDebug());

	shape.appendChild(firstInput);
	shape.appendChild(span);
	shape.appendChild(secondIput);
}

function setValueInputListener (input) {

}

function typeRestriction(input, type) {
	switch(type) {
		case "text-block":
			return false;
		case "output-value":
		case "input-value":
			if(input.value.length > 0) {
				const lastChar = input.value.charAt(input.value.length - 1);
				if(/[a-zA-Z]/.test(lastChar)) {
					return false;
				}
				else {
					input.value = input.value.slice(0, -1);
					return true;
				}
			}
			return false;
		default:
			return false;
	}
}

function handleDiamond (shape) {
	diamonds.push(shape);
	shape.style.marginTop = "19px";
	shape.children[0].remove();
	shape.children[0].style.width = "100px";
	shape.children[0].style.height = "100px";
	shape.children[1].style.marginTop = "-60px";
	shape.children[1].style.minWidth = "230px";
	shape.children[1].style.minHeight = "91px";
	shape.children[1].children[0].setAttribute("marker-end", "none");
	shape.children[1].children[0].setAttribute("points", "46 10, 16 10, 16 90, 150 90");
	shape.children[1].children[1].setAttribute("points", "184 10, 214 10, 214 90, 150 90");
	shape.children[1].style.height = "81px";

	addLeftDiamondConnectionDot(shape.children[1], shape.children[1].children[1]);
	addRightDiamondConnectionDot(shape.children[1]);
}

function addLeftDiamondConnectionDot(line, before) {
	const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
	foreignObject.setAttribute('width', '40px');
	foreignObject.setAttribute('height', '40px');
	foreignObject.setAttribute('x', "-3.5");
	foreignObject.setAttribute('y', "35");
	
	const dotArea = document.createElement("div");
	dotArea.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dotArea.classList.add("connection-area");	

	foreignObject.appendChild(dotArea);

	const dot = document.createElement("div");
	dot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dot.setAttribute("id", `diamond-dot-${diamondId++}`);
	dot.classList.add("connection-dot");
	dotArea.appendChild(dot);

	line.insertBefore(foreignObject, before);

	// Highlight dot on dragover
	dotArea.addEventListener("dragover", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "0 0 10px blue";
	});

	// Remove shadow on dragleave
	dotArea.addEventListener("dragleave", (event) => {
		if (!dotArea.contains(event.relatedTarget)) {
			event.preventDefault();
			dot.style.boxShadow = "none";
		}
	});

	// Drop logic for dots
	dotArea.addEventListener("drop", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "none";	
		if (draggedElement) addShapeToDiamond(draggedElement, dot.getAttribute("id").split("-")[2]);
	});
}

function addRightDiamondConnectionDot(line) {
	const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
	foreignObject.setAttribute('width', '40px');
	foreignObject.setAttribute('height', '40px');
	const xValue = (parseFloat(foreignObject.getAttribute('x')) || 50) - 13.2;
	foreignObject.setAttribute('x', "194");
	foreignObject.setAttribute('y', "35");
	
	const dotArea = document.createElement("div");
	dotArea.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dotArea.classList.add("connection-area");	

	foreignObject.appendChild(dotArea);

	const dot = document.createElement("div");
	dot.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
	dot.setAttribute("id", `diamond-dot-${diamondId++}`);
	dot.classList.add("connection-dot");
	dotArea.appendChild(dot);

	line.appendChild(foreignObject);

	// Highlight dot on dragover
	dotArea.addEventListener("dragover", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "0 0 10px blue";
	});

	// Remove shadow on dragleave
	dotArea.addEventListener("dragleave", (event) => {
		if (!dotArea.contains(event.relatedTarget)) {
			event.preventDefault();
			dot.style.boxShadow = "none";
		}
	});

	// Drop logic for dots
	dotArea.addEventListener("drop", (event) => {
		event.preventDefault();
		dot.style.boxShadow = "none";	
		if (draggedElement) addShapeToDiamond(draggedElement, dot.getAttribute("id").split("-")[2]);
	});
}


function retry() {
	dotId = 1;
	field.innerHTML = "";
	field.appendChild(shapes[0]);
	field.appendChild(shapes[shapes.length - 1]);
	addConnectionLine(shapes[shapes.length - 1]);
	terminateDebug();
}

let playSessionId = 0;

async function play() {
	terminateDebug();
	let displaySuccess = true;
	stopPlay = false;
	playStarted = true;
	const currentSessionId = ++playSessionId;

	for (let child of field.children) {
		if (!child.classList.contains("connection-line")) {
			if (!checkInput(child)) {
				playStarted = false;
				return;
			}
			if (stopPlay) {
				stopPlay = false;
				clearOutput();
				playStarted = false;
				return;
			}

			switch (child.getAttribute("data-id")) {
				case "text-block":
				case "start":
				case "end":
					child.style.backgroundColor = "#A3D76E";
					if (child.children.length != 0) {
						child.children[0].style.backgroundColor = "#A3D76E";
					}
					break;
				case "input-value":
					clearInnerOutput();
					displayInput(child.children[0].value);

					try {
						await wait(addListenerForSubmitButton, currentSessionId);
					} catch (e) {
						console.log(e);
					}

					child.style.backgroundColor = "#A3D76E";
					child.children[0].style.backgroundColor = "#A3D76E";
					break;
				case "output-value":
					clearInnerOutput();
					displaySuccess = false;
					const value = values.find(v => v.name === child.children[0].value.split(" ")[1]);
					if (value) {
						displayOutput(value);
						child.style.backgroundColor = "#A3D76E";
						child.children[0].style.backgroundColor = "#A3D76E";
					} else {
						console.log("stopPlay: ", stopPlay);
						console.log("playStarted: ", playStarted);
						child.style.backgroundColor = "#eb0020";
						child.children[0].style.backgroundColor = "#eb0020";
						display_error("Такого значенния не існує!");
						playStarted = false;
						return;
					}
					break;
				case "set-value":
					const firstInput = child.children[0].value;
					const secondInput = child.children[2].value;
					const leftName = values.find(v => v.name === firstInput);
					if (leftName) {
						leftName.value = calculateRightExpression(child.children[2].value);
					} else {
						values.push(new Value(firstInput, calculateRightExpression(secondInput)));
					}

					child.style.backgroundColor = "#A3D76E";
					child.children[0].style.backgroundColor = "#A3D76E";
					child.children[2].style.backgroundColor = "#A3D76E";
					break;
				default:
					break;
			}
		}
	}

	if (displaySuccess) {
		showSuccess();
	}

	playStarted = false;
}

function wait(action, sessionId) {
	return new Promise((resolve, reject) => {
		action(resolve, reject, sessionId);
	});
}

function addListenerForSubmitButton(resolve, reject, sessionId) {
	const submitButton = document.getElementById("submit-for-input-in-output");
	nextStepAllowed = false;
	dubugCondition(resolve, reject);
	submitButton.addEventListener("click", () => {
		if (sessionId !== playSessionId) { nextStepAllowed = true; return};
		const input = document.getElementById("input-in-output");

		if (input.value) {
			const name = input.getAttribute("placeholder").split(" ")[1];
			const existingValue = values.find(v => v.name === name);
			if (existingValue) {
				existingValue.value = input.value;
			} else {
				const value = new Value(name, input.value);
				values.push(value);
			}
			nextStepAllowed = true;
			clearInnerOutput();
			resolve();
		}
	});
}

function showSuccess() {
	const checkSign = document.createElement("span");
	checkSign.classList.add("material-icons");
	checkSign.classList.add("success-sign");
	checkSign.innerText = "check"
	const text = document.createElement("span");
	text.innerText = "Алгоритм виконано успішно!";
	output.appendChild(checkSign);
	output.appendChild(text);
}

async function debug() {
	if(!debugMode) {
		debugMode = true;
		debugExecution();
		debugCounter = 1;
	}
	else if(nextStepAllowed) {
		increaseDebugCounter();
	}
}

async function debugExecution() {
	clearOutput();
	let displaySuccess = true;
	const currentSessionId = ++playSessionId;
	nextStepAllowed = true;
	for(let child of field.children) {
		if (!child.classList.contains("connection-line")) {
			if(!checkInput(child)) {
				stopDebug();
				return;
			}
			let type = child.getAttribute("data-id");
			if(type != "start") {
				prevNode = currentNode;
			}

			currentNode = child;

			switch(type) {
				case "text-block":
				case "end":
					debugCounter++;
				case "start":
					try {
						await wait(goNext, currentSessionId);
					} catch(e) {
					}
					
					child.style.backgroundColor = "#A3D76E";
					if(child.children.length != 0) {
						child.children[0].style.backgroundColor = "#A3D76E";
					}
					break;
				case "input-value":
					clearInnerOutput();
					displayInput(child.children[0].value);
					
					try {
						await wait(addListenerForSubmitButton, currentSessionId);
					}
					catch(e) {
					}
					
					child.style.backgroundColor = "#A3D76E";
					child.children[0].style.backgroundColor = "#A3D76E";
					break;
				case "output-value":
					clearInnerOutput();
					debugCounter++;
					displaySuccess = false;

					try {
						await wait(goNext, currentSessionId);
					}
					catch(e) {
					}

					const value = values.find(v => v.name === child.children[0].value.split(" ")[1]);
					if (value) {
						displayOutput(value);
						child.style.backgroundColor = "#A3D76E";
						child.children[0].style.backgroundColor = "#A3D76E";
					} else {
						child.style.backgroundColor = "#eb0020";
						child.children[0].style.backgroundColor = "#eb0020";
						display_error("Такого значенния не існує!");
						stopDebug();
						return;
					}
					break;
				case "set-value":
					const firstInput = child.children[0].value;
					const secondInput = child.children[2].value;
					debugCounter++;

					try {
						await wait(goNext, currentSessionId);
					}
					catch(e) {
					}

					const leftName = values.find(v => v.name === firstInput);
					if(leftName) {
						leftName.value = calculateRightExpression(child.children[2].value);
					}
					else {
						values.push(new Value(firstInput, calculateRightExpression(secondInput)));
					}

					child.style.backgroundColor = "#A3D76E";
					child.children[0].style.backgroundColor = "#A3D76E";
					child.children[2].style.backgroundColor = "#A3D76E";
					break;
				default:
					break;
			}
		}
	}

	stopDebug();
	if(displaySuccess) {
		showSuccess();
	}
}

function stopDebug() {
	if(debugMode) {
		if(currentRejectFunc) currentRejectFunc();
		debugMode = false;
		debugCounter = 1;
		if(currentNode) currentNode.style.boxShadow = "none";
	}
	else if(playStarted) {
		stopPlay = true;
		if(currentRejectFunc) currentRejectFunc();
	}
}

function terminateDebug() {
	stopDebug();
	clearOutput();
}

function checkInput(child) {
	if(child.children.length != 0 && child.children[0].value.length == 0) {
		child.style.backgroundColor = "#eb0020";
		child.children[0].setAttribute("placeholderTemp", child.children[0].getAttribute("placeholder"));
		child.children[0].setAttribute("placeholder", "");
		child.children[0].style.backgroundColor = "#eb0020";
		display_error("Блок не може бути пустим!");
		return false;
	}
	else if(child.children.length > 2 && child.children[2].value.length == 0) {
		child.style.backgroundColor = "#eb0020";
		child.children[2].setAttribute("placeholderTemp", child.children[2].getAttribute("placeholder"));
		child.children[2].setAttribute("placeholder", "");
		child.children[2].style.backgroundColor = "#eb0020";
		display_error("Блок не може бути пустим!");
		return false;
	}
	return true;
}

function clearOutput() {
	clearInnerOutput();
	clearBackgrounds();
}

function clearInnerOutput() {
	output.innerHTML = "";
}

function clearBackgrounds() {
	values = [];
	for(let child of field.children) {
		if (!child.classList.contains("connection-line")) {
			child.style.backgroundColor = "#f9f9f9";
			if(child.children.length != 0) {
				child.children[0].style.backgroundColor = "#f9f9f9";
				if(child.children[0].getAttribute("placeholderTemp")) {
					child.children[0].setAttribute("placeholder", child.children[0].getAttribute("placeholderTemp"));
				}
			}

			if(child.children.length > 2) {
				child.children[2].style.backgroundColor = "#f9f9f9";
				if(child.children[2].getAttribute("placeholderTemp")) {
					child.children[2].setAttribute("placeholder", child.children[2].getAttribute("placeholderTemp"));
				}
			}
		}
	}
}

function display_error(text) {
	const errorSign = document.createElement("span");
	errorSign.classList.add("material-icons");
	errorSign.classList.add("error-sign");
	errorSign.innerText = "close"
	const errorText = document.createElement("span");
	errorText.innerText = text;
	output.appendChild(errorSign);
	output.appendChild(errorText);
}

function displayInput(name) {
	const displayInputContainer = document.createElement('div');
	displayInputContainer.classList.add("display-input-container");

	name = name.split(" ")[1];
	const label = document.createElement("label");
	label.innerText = `Введіть ${name}:`;
	label.setAttribute("for", "input-in-output");
	displayInputContainer.appendChild(label);

	const input = document.createElement("input");
	input.setAttribute("placeholder", `Введіть ${name}`);
	input.setAttribute("id", "input-in-output");

	input.style.width = "40%";
	input.style.height = "45%";
	displayInputContainer.appendChild(input);

	const submitButton = document.createElement("button");
	submitButton.innerText = "Ввести";
	submitButton.classList.add('cta');
	submitButton.classList.add('cta-primary');
	submitButton.classList.add('disabled');
	submitButton.setAttribute("id", "submit-for-input-in-output");
	displayInputContainer.appendChild(submitButton);


	input.addEventListener('input', () => {
		if(!(/[0-9]/.test(input.value.charAt(input.value.length - 1)))) {
			input.value = input.value.slice(0, -1);
		}

		if(input.value.length > 15) {
			input.value = input.value.slice(0, 15);
		}

		if (input.value.length > 0) {
			submitButton.classList.remove("disabled");
		}
		else if (!submitButton.classList.contains("disabled")) {
			submitButton.classList.add("disabled");
		}
	});

	output.appendChild(displayInputContainer);
}

function displayOutput(value) {
	const span = document.createElement("span");
	span.innerText = value.name + " = " + value.value;
	span.classList.add("big-text");
	output.appendChild(span);
}

function increaseDebugCounter() {
	debugCounter++;
	goNext(currentResolveFunc, currentRejectFunc);
}

function goNext(resolve, reject, currentSessionId) {
	dubugCondition(resolve, reject);
	if(debugCounter % 2 == 0) {
		resolve();
	};
}

function dubugCondition(resolve, reject) {
	reject = function() { let isRejected = true; };
	if(prevNode != null) prevNode.style.boxShadow = "none";
	if(currentNode) currentNode.style.boxShadow = "0 0 10px #1763a6";
	currentResolveFunc = resolve;
	currentRejectFunc = reject;
}

function calculateRightExpression(expression) {
	let stringToEvaluate = "";
	for(char of expression) {
		if(char == ' ') continue;
		if (/[0-9+\-*/()]/.test(char)) stringToEvaluate += char + " ";
		else if (/[a-zA-Z]/.test(char)) {
			const value = values.find(v => v.name === char);
			if (value) {
				stringToEvaluate += value.value + " ";
			} else {
				display_error(`Значення для ${char} не знайдено!`);
				throw new Error(`Значення для ${char} не знайдено!`);
			}
		}
	}

	return eval(stringToEvaluate);
}
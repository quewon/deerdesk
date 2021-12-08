import {GLTFLoader} from "./GLTFLoader.js";
import {EffectComposer} from "./EffectComposer.js";
import {RenderPass} from "./RenderPass.js";
import {UnrealBloomPass} from "./UnrealBloomPass.js";
import {BokehPass} from './BokehPass.js';
import {CSS2DRenderer, CSS2DObject} from './CSS2DRenderer.js';

var HALF_PI = Math.PI / 2;
var SHADOW_BIAS = -0.0002;
var GAMEUI = document.getElementById("gameui");
var GAMEINTRO = document.getElementById("gameintro");
var PAUSE = "II";

var _width, _height;
var _renderer, _camera, _raycaster, _composer, _clock;
var _label;
var _preview_renderer, _preview_camera;
var _loader = new GLTFLoader();
var _texture_loader = new THREE.TextureLoader();
var _scene = new THREE.Scene();
var _preview = new THREE.Scene();
var _container = document.getElementById("canvases");
var _controls = {
	touch: false,
	realPos: new THREE.Vector2(),
	pos: new THREE.Vector2(),
	prevPos: null,
	offset: new THREE.Vector2(),
	speedFactor: 2.25,
	speed: undefined,
	update: function(dt) {
		if (_controls.offset) {
			if (_controls.offset.x > 0 || _controls.offset.y > 0) {
				let offsetX = _controls.offset.x * dt * 1.5;
				let offsetY = _controls.offset.y * dt * 1.5;

				if (!_controls.lockRotation) {
					_current_scene.group.rotation.y += offsetX;
				// _current_scene.group.rotation.x -= offsetY;
				}

				// _current_scene.group.rotation.x = cap(_current_scene.group.rotation.x, -HALF_PI, HALF_PI);

				_controls.offset.x -= offsetX;
				_controls.offset.y -= offsetY;
			}
		}
	},
	lockRotation: false,
};
var _current_scene = null;
var _current_preview = null;

function init() {
	// load assets

	let soundcounter = 0;
	for (const name in assets.sounds) {
		let file = assets.sounds[name];
		assets.sounds[name] = new Howl(file);
		soundcounter++;

		assets.sounds[name].on('load', function() {
			soundcounter--;
			if (soundcounter == 0) {
				console.log("all sounds loaded.");
				loadimgs();
			}
		});
	}
	
	function loadimgs() {
		let imgcounter = 0;
		
		for (const name in assets.images) {
			imgcounter++;
			
			var img = document.createElement("img");
			img.src = assets.images[name];
			assets.images[name] = img;
			img.onload = function() {
				imgcounter--;
				if (imgcounter == 0) {
					console.log("all images loaded.");
					loadmodels();
				}
			};
		}
	}

	function loadmodels() {
		var models = {};
		let mcounter = 0;
		
		const texture = _texture_loader.load(assets.images.texture.src);
		texture.encoding = THREE.sRGBEncoding;
		texture.flipY = false;
		
		for (const name in assets.models) {
			mcounter++;
			_loader.load(assets.models[name], function(gltf) {
				const group = gltf.scene;
				
				for (let child of group.children) {
					if ('material' in child) {
						if (child.material.emissive.g == 0) {
							child.material.map = texture;
							child.material.metalness = 0;
						}
						child.castShadow = true;
						child.receiveShadow = true;
					}
					models[child.name] = child;
				}
				
				mcounter--;
				if (mcounter == 0) {
					assets.models = models;
					console.log("all models loaded.");
					init_3d();
				}
			});
		}
	}
}

function init_3d() {
	_renderer = new THREE.WebGLRenderer({ alpha: true });
	_preview_renderer = new THREE.WebGLRenderer({ alpha: true });
	_label = new CSS2DRenderer();
	_renderer.setClearColor( 0x384636, 0 );
	_preview_renderer.setClearColor( 0x384636, 0 );
	
	const fov = 50;
	const aspect = 2;
	const near = 1;
	const far = 500;
	_camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	
	_preview_camera = _camera.clone();

	getSize();

	_renderer.outputEncoding = THREE.sRGBEncoding;
	_renderer.shadowMap.enabled = true;
	_renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	_renderer.domElement.classList.add("centered");
	_renderer.setPixelRatio(window.devicePixelRatio * 2);
	_container.appendChild( _renderer.domElement );
	
	_preview_renderer.outputEncoding = THREE.sRGBEncoding;
	_preview_renderer.shadowMap.enabled = true;
	_preview_renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	_preview_renderer.setPixelRatio(window.devicePixelRatio * 2);
	const intro = document.getElementById("gameintro");
	intro.replaceChild(_preview_renderer.domElement, intro.querySelector("canvas"));
	
	_label.domElement.classList.add("centered");
	_container.appendChild(_label.domElement);
	
	// _composer = new EffectComposer(_renderer);
	// _composer.addPass(new RenderPass(_scene, _camera));
	// const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
	// 			bloomPass.threshold = 0.4;
	// 			bloomPass.strength = 0.3;
	// 			bloomPass.radius = 1.5;
	// _composer.addPass(bloomPass);
	// _composer.addPass(new BokehPass(_scene, _camera, {
	// 	focus: 0.5,
	// 	aperture: 0,
	// 	maxblur: 0.05,
	// 	// width: _width,
	// 	// height: _height,
  // }));

	_raycaster = new THREE.Raycaster();
	
	//
	
	_scene.add(new THREE.AmbientLight(0xf2c46f, 0.2));
	_preview.add(new THREE.AmbientLight(0xf2c46f, 0.25));

	// controls

	var touchDevice = (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement);

	if (!touchDevice) {
		_container.addEventListener("mouseup", function(e) {
			_controls.select(e);
		});
		_container.addEventListener("mousedown", function() {
			_controls.touch = true;
		});
		_container.addEventListener("mousemove", function(e) {
			_controls.move(e);
		});
	} else {
		_container.addEventListener("touchstart", function(e) {
			// this prevents user from touching buttons
			// e.preventDefault();
			_controls.touch = true;
			_controls.move(e);
		});
		_container.addEventListener("touchmove", function(e) {
			e.preventDefault();
			_controls.move(e);
		});
		_container.addEventListener("touchend", function(e) {
			if (e.target.tagName == "button") e.preventDefault();
			if (e.target.parentNode) {
				if (e.target.parentNode.tagName == "button") e.preventDefault();
			}
			_controls.select(e);
			// double tap happens because mouseup and touchend both work
		});
	}
	_container.addEventListener("blur", function(e) {
		_controls.select(e);
	});
	window.addEventListener("resize", getSize);
	document.oncontextmenu = function() {
		return false;
	};
	
	_clock = new THREE.Clock();
	_clock.start();

	//
	
	init_scenes();
	draw();
	
	//
	
	document.getElementById("loading").classList.add("hidden");
}

function draw() {
	const dt = _clock.getDelta();
	
	_current_scene.update(dt);
	if (_current_preview) _current_preview.update(dt);
	_controls.update(dt);

	// render

	_renderer.render(_scene, _camera);
	// _composer.render();
	_preview_renderer.render(_preview, _preview_camera);
	_label.render(_scene, _camera);

	requestAnimationFrame(draw);
}

_controls.move = function(e) {
	let x, y;

	if (e.touches) {
		let touch = e.touches[0] || e.changedTouches[0] || null;
		x = touch.pageX;
		y = touch.pageY;
	} else {
		x = e.pageX;
		y = e.pageY;
	}
	_controls.realPos.set(x, y);
	let pos = normalizedMousePosition(x, y);

	if (!_controls.prevPos) {
		_controls.prevPos = new THREE.Vector2(pos.x, pos.y);
	} else {
		_controls.prevPos.set(_controls.pos.x, _controls.pos.y);
	}
	_controls.pos.set(pos.x, pos.y);

	// hold and drag action
	if (_controls.touch) {
		_controls.offset.set(
			(_controls.pos.x - _controls.prevPos.x) * _controls.speed,
			(_controls.pos.y - _controls.prevPos.y) * _controls.speed
		);
		
		if (!_controls.lockRotation) {
			_current_scene.group.rotation.y += _controls.offset.x;
		}
		// _current_scene.group.rotation.x -= _controls.offset.y;

		// _current_scene.group.rotation.x = cap(_current_scene.group.rotation.x, -HALF_PI, HALF_PI);
	}

	// cursor
	_raycaster.setFromCamera(_controls.pos, _camera);
	const intersects = _raycaster.intersectObjects(_current_scene.group.children);
	if (intersects[0]) {
		let obj = intersects[0].object.name;
		if (_current_scene.keys.includes(obj)) {
			document.body.style.cursor = "pointer";
		} else {
			document.body.style.cursor = "auto";
		}
	} else {
		document.body.style.cursor = "auto";
	}
};

function normalizedMousePosition(x, y) {
	const rect = _renderer.domElement.getBoundingClientRect();

	return {
		x: ((x - rect.left) / rect.width * 2) - 1,
		y: - ((y - rect.top) / rect.height * 2) + 1,
	};
}

_controls.select = function(e) { // mouseup
	// click
	_raycaster.setFromCamera(_controls.pos, _camera);
	const intersects = _raycaster.intersectObjects(_current_scene.group.children);
	if (intersects[0]) {
		let obj = intersects[0].object.name;
		_current_scene.key(obj);
	} else {
		_current_scene.key(null);
	}

	// reset
	_controls.touch = false;
	_controls.prevPos = null;
};

function getSize() {
	let height = document.documentElement.clientHeight;
	let width = document.documentElement.clientWidth;
	
	if (height <= width) {
		_height = height;
		_width = height;
		_controls.speed = _controls.speedFactor * width/height / 3;
	} else if (height > width) {
		_width = width;
		_height = width;
		_controls.speed = _controls.speedFactor * height/width / 3;
	}
	
	let prevsize = _height/3;
	
	if ('getSize' in phone) {
		phone.getSize();
	}
	if ('getSize' in guestbook) {
		guestbook.getSize();
	}
	
	_camera.aspect = 1;
  _camera.updateProjectionMatrix();
	
	_preview_camera.aspect = 1;
  _preview_camera.updateProjectionMatrix();

	_renderer.setSize( _width, _height );
	_label.setSize( _width, _height );
	_preview_renderer.setSize(prevsize, prevsize);
}

// SCENES

var ref = [];

class scene {
	constructor(p) {
		this.id = ref.length;
		this.objects = p.objects;

		this.init = p.init;
		this.key = p.key;

		var group = new THREE.Group();
		group.visible = false;
		_scene.add(group);
		this.group = group;
		this.neverLoaded = true;
		
		this.update = p.update || function(){};
		this.withLoad = p.withLoad || function(){};
		this.withUnload = p.withUnload || function(){};

		this.css2d = [];
		
		this.keys = p.keys || [];

		ref.push(this);
	}

	load() {
		game();
		
		if (this.neverLoaded) {
			this.init(this.group);
			this.neverLoaded = false;
		}
		
		if (_current_scene) {
			for (let label of _current_scene.css2d) {
				label.parent.remove(label);
			}
			_current_scene.css2d = [];
			_current_scene.withUnload();
			_current_scene.group.visible = false;
		}

		this.group.visible = true;

		_current_scene = this;
		
		GAMEUI.classList.remove("hidden");
		this.withLoad();
	}
	
	loadFromList(load) {
		for (const name of load) {
			var obj = assets.models[name];
			var mesh = new THREE.Mesh(obj.geometry.clone(), obj.material.clone());
			mesh.name = name;
			mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
			mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
			mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
			mesh.castShadow = obj.castShadow;
			mesh.receiveShadow = obj.receiveShadow;
			this.group.add(mesh);
		}
	}
	
	loadLabels(labels) {
		for (let label of labels) {
			let div = document.createElement("div");
			div.className = "label";
			div.textContent = label.text;
			let obj = new CSS2DObject(div);
			const object = this.group.getObjectByName(label.obj);
			obj.position.set(0, 1 / object.scale.y, 0);
			object.add(obj);
			
			this.css2d.push(obj);
		}
	}
}

class preview extends scene {
	constructor(p) {
		super(p);
		
		this.id = ref.length;
		this.objects = p.objects;

		this.init = p.init;
		this.key = p.key;

		var group = new THREE.Group();
		group.visible = false;
		_preview.add(group);
		this.group = group;
		this.neverLoaded = true;
		
		this.update = p.update || function(){};
		this.withLoad = p.withLoad || function(){};

		ref.push(this);
	}
	
	load() {
		if (this.neverLoaded) {
			this.init(this.group);
			this.neverLoaded = false;
		}
		
		this.withLoad();
		
		if (_current_preview) {
			_current_preview.group.visible = false;
		}

		this.group.visible = true;

		_current_preview = this;
	}
}

function pause(name, score) {
	game("pause", score);
	const button = document.querySelector("#gameintro button");
	button.onclick = button.ontouchend = function() {
		bedroom.load();
		play("click");
	};
	let button2 = GAMEINTRO.querySelector("#return");
	button2.onclick = button2.ontouchend = function() {
		_current_scene.key("unpause");
		play("click");
	};
}

function unpause() {
	game();
	GAMEUI.classList.remove("hidden");
}

function setScore(name, score) {
	window.player.wins[name] = score;
	window.socket.emit('setscore', { game: name, username: window.player.username, score: score });
}

function game(name, score) {
	_controls.touch = false;
	
	if (name) {
		if (!score && isNaN(score)) play("click");
		const game = games[name];
		GAMEINTRO.classList.remove("hidden");
		
		let span = GAMEINTRO.querySelector("span");
		let button = GAMEINTRO.querySelector("button");
		let button2 = GAMEINTRO.querySelector("#return");
		let levels = GAMEINTRO.querySelector("div");
		
		span.innerHTML = game.title;
		
		levels.textContent = "";
		if (score) {
			levels.textContent = "점수: "+score;
		} else {
			const lf = "◍";
			const le = "◌";
			for (let i=1; i<=5; i++) {
				if (i <= window.player.wins[name]) {
					levels.textContent += lf+" ";
				} else {
					levels.textContent += le+" ";
				}
			}
		}
		
		game.preview.load();
		_controls.lockRotation = true;
		
		// levels.classList.remove("hidden");
		button.textContent = "시작하기";
		
		if (name == "pause") {
			GAMEUI.classList.add("hidden");
			button.textContent = "방으로 돌아가기";
			button2.classList.remove("hidden");
			// levels.classList.add("hidden");
		} else {
			button.onclick = button.ontouchend = function() { games[name].load(); play("click"); };
			button2.classList.add("hidden");
		}
		
		if ('message_made' in phone) {
			if (name == "phone" && window.player.messages.length > 0) {
				phone.message_made.classList.remove("hidden");
			} else {
				phone.message_made.classList.add("hidden");
			}
		}
	} else {
		GAMEINTRO.classList.add("hidden");
		_controls.lockRotation = false;
	}
}

function init_scenes() {
	guestentry.load();
	
	console.log("all scenes loaded.");
}

//

var assets = {
	models: {
		"bedroom": "models/bedroom.glb",
		"phone": "models/phone.glb",
		"pc": "models/pc.glb",
		"guestbook": "models/guestbook.glb",
	},
	images: {
		"texture": "images/palette.png",
		"zoom": "images/zoom.png",
	},
	sounds: {
		"startup": { src: "sounds/startup.wav", loop: false },
		"type/1": { src: "sounds/type/1.wav", loop: false },
		"type/2": { src: "sounds/type/2.wav", loop: false },
		"type/3": { src: "sounds/type/3.wav", loop: false },
		"click": { src: "sounds/click.wav", loop: false },
		"eraser": { src: "sounds/wiper.wav", loop: false },
		"bedroom": { src: "sounds/midnight.wav", loop: true },
		"phone": { src: "sounds/link.wav", loop: true },
		"frequency": { src: "sounds/frequency.wav", loop: true },
		"drop": { src: "sounds/drop.wav", loop: false },
		"bite": { src: "sounds/bite.wav", loop: false },
		"marker": { src: "sounds/marker.wav", loop: true },
		"win": { src: "sounds/win.wav", loop: false },
		"lose": { src: "sounds/lose.wav", loop: false },
		"flip": { src: "sounds/click.wav", loop: false },
		"collision": { src: "sounds/collision.wav", loop: false },
		
		"snake": { src: "sounds/snake.wav", loop: true },
		"frog": { src: "sounds/frog.wav", loop: true },
		"bear": { src: "sounds/bear.wav", loop: true },
		"cat": { src: "sounds/cat.wav", loop: true },
		"monkey": { src: "sounds/monkey.wav", loop: true },
	},
};

function play(sound, volume) {
	if (volume) assets.sounds[sound].volume(volume);
	assets.sounds[sound].play();
}
function stop(sound) {
	assets.sounds[sound].pause();
}

var guestentry = new scene({
	init: function(group) {
		this.ui = document.createElement("div");
		this.ui.id = "guestentry";
		let button = document.createElement("button");
		this.log = function() {
			let g = this.ui.querySelector("input").value.trim();
			console.log(g);
			if (g != "") {
				window.socket.emit('guestbook', g);
				window.player.username = g;
				bedroom.load();
			};
		};
		button.onclick = function() {
			play("startup");
			let ui = guestentry.ui;
			ui.innerHTML = "게스트북에 이름을 적어주시겠습니까?<br><br>이름: ";
			let input = document.createElement("input");
			input.type = "text";
			input.autofocus = true;
			ui.addEventListener("keydown", function(e) {
				let k = e.key;
				play(["type/1", "type/2", "type/3"][Math.random() * 3 | 0]);
				
				if (k == "Enter") {
					console.log(guestentry);
					guestentry.log();
				}
			});
			ui.appendChild(input);
			ui.innerHTML += "<br><br>";
			let ybutton = document.createElement("button");
			ybutton.textContent = "✓";
			ybutton.onclick = ybutton.ontouchend = function() { guestentry.log(); play("click"); };
			let nbutton = document.createElement("button");
			nbutton.textContent = "건너뛰기";
			nbutton.onclick = nbutton.ontouchend = function() { bedroom.load(); play("click"); };
			ui.appendChild(ybutton);
			ui.appendChild(nbutton);
		};
		button.innerHTML = '<svg fill="var(--light)" width="30" height="30" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve"><path d="M673,101.1c-7.2-2.9-14.7-4.4-22.4-4.4c-24.5,0-46.2,14.6-55.4,37.3c-12.4,30.5,2.4,65.5,33,77.8C758,264.4,841.8,388.8,841.8,528.7c0,188.5-153.3,341.8-341.8,341.8c-188.5,0-341.8-153.3-341.8-341.8c0-139.9,83.8-264.2,213.6-316.8c14.8-6,26.4-17.4,32.6-32.1c6.2-14.7,6.4-30.9,0.4-45.7c-9.2-22.7-30.9-37.3-55.4-37.3c-7.7,0-15.2,1.5-22.4,4.4C151.8,172.1,38.7,339.9,38.7,528.7C38.7,783.1,245.6,990,500,990c254.4,0,461.3-206.9,461.3-461.3C961.3,339.8,848.2,172,673,101.1z"/><path d="M500,435.3c27.5,0,49.8-22.3,49.8-49.8V59.8c0-27.5-22.3-49.8-49.8-49.8c-27.5,0-49.8,22.3-49.8,49.8v325.7C450.2,413,472.5,435.3,500,435.3z"/></svg>';
		this.ui.appendChild(button);
		GAMEUI.appendChild(this.ui);
		this.ui.classList.add("hidden");
	},
	withLoad: function() {
		this.ui.classList.remove("hidden");
	},
	withUnload: function() {
		this.ui.classList.add("hidden");
	},
	key: function() { },
});
var guestbook = new scene({
	init: function(group) {
		this.loadFromList([
			"closed_book",
			"open_book",
			"guestbook_pencil",
		]);
		
		this.open = group.getObjectByName("open_book");
		this.closed = group.getObjectByName("closed_book");
		
		const toplight = new THREE.SpotLight(0xffe01c, 0.75);
		toplight.position.set(0, 0, 10);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
		
		this.ui = document.getElementById("guestbook");
		this.body = this.ui.querySelector("span");
		this.pagination = this.ui.querySelector("#pagination");
		
		this.getSize = function() {
			let scale = _height / 250;
			this.ui.style.width = 80*scale+"px";
			this.body.style.height = 100*scale+"px";
			this.ui.style.fontSize = 6*scale+"px";
		};
		this.getSize();
		
		this.currentPage = 0;
		this.startingPages = [
			{
				content: "<h1>guestbook</h1><br>2021 dima 뉴미디어 페스티벌",
				book: "closed",
			},
			{
				content: `
				<h1>오늘의 일기</h1>
				목차:
				<ol>
					<li>리더보드 - 1</li>
					<li>리더보드 - 2</li>
					<li>게스트북</li>
				</ol>
				<hr>
				<span style='font-size:0.75em'>
				안녕하세요!<br>
				여기까지 찾아와주셔서 감사합니다.<br>
				모든 게임은 '터치' 액션으로만 이루어져 있습니다.<br>
				- 규원
				</span>`,
				book: "open",
			},
		];
		this.updateBook = function() {
			this.pages = [];
			this.pages[0] = this.startingPages[0];
			this.pages[1] = this.startingPages[1];
			
			// leaderboards
			var pc = "";
			var phone = "";
			
			const scores = window.scores;
			scores.pc.sort((a, b) => (a.score < b.score) ? 1 : -1);
			scores.phone.sort((a, b) => (a.score < b.score) ? 1 : -1);
			
			var max = 6;
			for (let i=0; i<max; i++) {
				let data = scores.pc[i];
				if (!data) break;
				pc += "<li>"+data.username+" - "+data.score+"점</li>"
			}
			if (pc == "") { pc = "음... 아무도 없네!?" }
			
			for (let i=0; i<max; i++) {
				let data = scores.phone[i];
				if (!data) break;
				phone += "<li>"+data.username+" - "+data.score+"점</li>"
			}
			if (phone == "") { phone = "음... 아무도 없네!?" }
			
			pc = "<h1>컴퓨터 게임 리더보드</h1><hr><ol>"+pc+"</ol>";
			phone = "<h1>핸드폰 게임 리더보드</h1><hr><ol>"+phone+"</ol>";
			
			this.pages.push({
				content: pc,
				book: "open",
			});
			this.pages.push({
				content: phone,
				book: "open",
			});
			
			// guestbook
			const guests = window.guestbook;
			var content = [];
			var y = 0;
			var x = 0;
			max = 8;
			content[x] = "";
			for (let name of guests) {
				content[x] += name+"<br>";
				y++;
				if (y >= max) {
					y = 0;
					x++;
					content[x] = "";
				}
			}
			
			for (let page of content) {
				this.pages.push({
					content: "<h1>guestbook</h1><hr>"+page,
					book: "open"
				})
			}
		};
		
		this.page = function(num) {
			var p = this.pages[num];
			this.body.innerHTML = p.content;
			this.open.visible = false;
			this.closed.visible = false;
			this[p.book].visible = true;
			
			if (p.book == "closed") {
				this.ui.classList.remove("dark");
			} else {
				this.ui.classList.add("dark");
			}
			
			this.currentPage = num;
			let buttons = this.pagination.querySelectorAll("button");
			if (num < 1) {
				buttons[0].onclick = buttons[0].ontouchend = function() {
					bedroom.load();
					play("click");
				};
			} else {
				buttons[0].onclick = buttons[0].ontouchend = function() {
					guestbook.page(guestbook.currentPage - 1);
					play("flip");
				};
			}
			if (num >= this.pages.length-1) {
				buttons[1].classList.add("hidden");
			} else {
				buttons[1].classList.remove("hidden");
				buttons[1].onclick = buttons[1].ontouchend = function() {
					guestbook.page(guestbook.currentPage + 1);
					play("flip");
				};
			}
		};
		
		this.ui.classList.add("hidden");
	},
	withLoad: function() {
		play("click");
		play("bedroom");
		_camera.position.set(0, 0, 3);
		_camera.lookAt(0, 0, 0);
		_controls.lockRotation = true;
		this.ui.classList.remove("hidden");
		
		this.open.visible = false;
		this.closed.visible = true;
		this.updateBook();
		
		this.page(0);
	},
	withUnload: function() {
		stop("bedroom")
		this.ui.classList.add("hidden");
	},
	keys: [],
	key: function() { }
});
var bedroom = new scene({
	init: function(group) {
		this.loadFromList([
			"floor",
			
			"3",
			"6",
			"9",
			"12",
			"hour_hand",
			"minute_hand",
			"clock_lines",
			"clock",
			
			"bed",
			
			"phone_case",
			"phone_screen",
			
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
			"guestbook",
			"pencil",
			
			"computer_plug",
			"pc",
			"pc_screen",
			
			"charger",
			"charger001",
			"charger002",
			"charger003",
			
			"window",
			"curtain_lever",
			
			"deer"
		]);
		
		const toplight = new THREE.SpotLight(0xffe01c, 0.75);
		toplight.position.set(0, 13, 0);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
		
		group.rotation.y = -2;
		_renderer.render(_scene, _camera);
	},
	withLoad: function() {
		play("bedroom");
		
		_camera.position.set(0, 10, 35);
		_camera.lookAt(0, 0, 0);
		_camera.position.y = 15;
		GAMEUI.classList.add("hidden");
		
		this.loadLabels([
			{
				obj: "phone_case",
				text: "v"
			},
			{
				obj: "pc",
				text: "v"
			},
			{
				obj: "guestbook",
				text: "v"
			}
		]);
	},
	withUnload: function() {
		stop("bedroom");
	},
	keys: ["phone_case", "phone_screen", "pc", "pc_screen", "guestbook"],
	key: function(obj) {
		switch (obj) {
			case "phone_case":
			case "phone_screen":
				game("phone");
				break;
			case "pc":
			case "pc_screen":
				game("pc");
				break;
			case "guestbook":
				guestbook.load();
				break;
			default:
				game();
				break;
		}
	}
});
var phone = new scene({
	init: function(group) {
		this.loadFromList([
			"bobber",
			"fishing_phone",
			"pool",
			
			"screen",
			"screen_back",
			
			"deer"
		]);
		
		const deer = this.group.getObjectByName("deer");
		deer.position.set(-9.25, 5.25745, -2.55082);
		deer.rotation.y = HALF_PI;
		
		this.context = document.createElement("canvas").getContext("2d");
		this.texture = new THREE.CanvasTexture(this.context.canvas);
		this.texture.flipY = false;
		this.context.strokeStyle = "#00ffff";
		
		const screen = this.group.getObjectByName("screen");
		const screen2 = this.group.getObjectByName("screen_back");
    const box = new THREE.Box3().setFromObject(screen);
		var height = box.max.y - box.min.y;
		var width = box.max.z - box.min.z;
		this.context.canvas.width = width * 50;
		this.context.canvas.height = height * 50;
		screen.material.map = screen2.material.map = this.texture;
		screen.material.transparent = screen2.material.transparent = true;
		screen.material.emissive = screen2.material.emissive = assets.models["pc_screen"].material.emissive;
		this.context.strokeStyle = "#00ffff";
		this.context.lineWidth = 2;
		this.context.textAlign = "center";
		this.context.font = "40px monospace";
		this.texture.minFilter = THREE.LinearFilter;
		
		this.drawing_menu = document.getElementById("drawing_menu");
		this.message = document.createElement("canvas").getContext("2d");
		this.message.canvas.width = this.context.canvas.width-20;
		this.message.canvas.height = this.context.canvas.height/2-60;
		
		this.getSize = function() {
			let scale = _height/600;
			this.message.canvas.style.width = this.message.canvas.width*scale+"px";
			this.message.canvas.style.height = this.message.canvas.height*scale+"px";
			this.message.canvas.style.marginLeft = 11*scale+"px";
		};
		this.getSize();
		
		this.message.canvas.style.zIndex = 10;
		this.message.canvas.style.borderRadius = "2em";
		this.message.canvas.classList.add("centered");
		_container.appendChild(this.message.canvas);
		this.message.strokeStyle = "white";
		this.message.lineWidth = 5;
		this.message.lineCap = "round";
		this.message.imageSmoothingEnabled = false;
		
		this.history = [];
		
		this.reload = function() {
			window.socket.emit('imgrequest');
			phone.state = "idle";
			_camera.position.set(0, 5, 35);
			_camera.lookAt(0, 0, 0);
			_camera.position.y = 10;
			phone.drawing_menu.classList.add("hidden");
			phone.message.canvas.classList.add("hidden");
			phone.ui.classList.add("hidden");
			phone.group.rotation.y = HALF_PI - 0.25;
			phone.pulltime = phone.wintime;
			_controls.lockRotation = false;
		};
		
		this.ui = document.createElement("div");
		this.message_made = document.getElementById("message_made");
		this.ui.id = "phone_ui";
		let button = document.createElement("button");
		button.textContent = "완료";
		let eraser = document.createElement("button");
		eraser.textContent = "전부 지우기";
		button.onclick = button.ontouchend = function() {
			stop("marker");
			play("click");
			play("drop");
			if (window.player.messages.length == 0) {
				let button = phone.message_made;
				button.onclick = button.ontouchend = function() {
					phone.load();
					assets.sounds.drop.seek(0);
					phone.state = "drawing";
					phone.drawing_menu.classList.remove("hidden");
					phone.message.canvas.classList.remove("hidden");
					// _renderer.domElement.classList.add("hidden");
					_controls.lockRotation = true;
					_camera.position.set(0, 35, 0);
					_camera.lookAt(0, 0, 0);
					phone.group.rotation.y = 0;
					phone.pulltime = -1;
				};
			}
			let src = phone.message.canvas.toDataURL();
			window.player.messages.push(src);
			// SOCKET
			window.socket.emit('imgdrawn', { src: src });
			
			phone.state = "idle";
			_camera.position.set(0, 5, 35);
			_camera.lookAt(0, 0, 0);
			_camera.position.y = 10;
			phone.drawing_menu.classList.add("hidden");
			phone.message.canvas.classList.add("hidden");
			phone.ui.classList.add("hidden");
			phone.group.rotation.y = HALF_PI - 0.25;
			phone.pulltime = phone.wintime;
			_controls.lockRotation = false;
		};
		eraser.onclick = eraser.ontouchend = function() {
			phone.pulltime = phone.message.canvas.height;
			play("eraser");
		};
		this.ui.appendChild(eraser);
		this.ui.appendChild(button);
		this.ui.classList.add("centered");
		GAMEUI.appendChild(this.ui);
		
		const pool = this.group.getObjectByName("pool");
		pool.material = new THREE.MeshPhysicalMaterial({
			emissiveMap: pool.material.map,
			map: pool.material.map,
			transparent: true,
			opacity: 1,
			transmission: 0.5,
			roughness: 0,
			specularIntensity: 1,
			ior: 2,
			reflectivity: 0.5,
		});
		pool.material.emissive = { r:1, g:1, b:1, isColor: true };
		
		const toplight = new THREE.PointLight(0x00ffff, 0.5);
		toplight.position.set(0, 2.1, 0);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
		
		// game end
		// group.rotation.y = HALF_PI - 0.25;
		
		// game objects
		
		this.bobber = this.group.getObjectByName("bobber");
		this.bobber.point = this.bobber.position.y;
		this.chance = 1000;
		this.indicator = new THREE.Mesh(
			new THREE.BoxGeometry(0.5, 4, 0.5),
			new THREE.MeshPhysicalMaterial({
				transparent: true,
				opacity: 0.25,
				transmission: 0.5,
				roughness: 0,
				specularIntensity: 0.5,
				ior: 1,
				reflectivity: 0.5,
				color: 0x00ffff,
				emissive: 0x00ffff,
			}),
		);
		this.indicator.position.set(this.bobber.position.x, 4, this.bobber.position.z);
		this.group.add(this.indicator);
		
		this.drawHistory = function(func) {
			const c = this.context;
			
			let y = 100;
			if (func) {
				func(0);
				// y = 100;
			}
			// else {
			// 	y = 0;
			// }
			
			for (let i=this.history.length-1; i>=0; i--) {
				let img = this.history[i];
				c.strokeRect(0, y, img.width, img.height);
				c.drawImage(img, 0, y);
				y += img.height + 10;
			}
		}
	},
	withLoad: function() {
		assets.sounds.phone.seek(0);
		play("phone");
		
		this.loadLabels([
			{
				obj: "deer",
				text: PAUSE
			}
		]);
		
		this.level = 0;
		this.ui.classList.add("hidden");
		this.message.clearRect(0, 0, this.message.canvas.width, this.message.canvas.height);
		this.prevmouse = null;
		this.velocity = 0;
		this.indicator.visible = false;
		this.time = -100;
		this.wintime = 200;
		if (window.player.messages.length == 0) {
			this.state = "drawing";
			this.drawing_menu.classList.remove("hidden");
			this.message.canvas.classList.remove("hidden");
			// _renderer.domElement.classList.add("hidden");
			_controls.lockRotation = true;
			_camera.position.set(0, 35, 0);
			_camera.lookAt(0, 0, 0);
			this.group.rotation.y = 0;
			this.pulltime = -1;
		} else {
			this.reload();
		}
		this.eraseSpeed = 3;
	},
	withUnload: function() {
		stop("phone");
		stop("frequency");
		
		this.drawing_menu.classList.add("hidden");
		this.ui.classList.add("hidden");
		this.message.canvas.classList.add("hidden");
	},
	keys: ["deer"],
	key: function(obj) {
		switch (obj) {
			case "deer":
				if (this.state != "pull") {
					if (this.level > window.player.wins.phone) {
						setScore("phone", this.level);
					}
					pause("phone");
				}
				break;
			case "unpause":
				unpause();
				if (this.ui.classList.contains("hidden")) {
					this.state = "idle";
				} else {
					_controls.lockRotation = true;
					this.state = "drawing";
				}
				break;
		}
	},
	update: function(dt) {
		const c = this.context;
		const width = c.canvas.width;
		const height = c.canvas.height;
		
		c.clearRect(0, 0, width, height);
		this.texture.needsUpdate = true;
		
		let lvl = this.level;
		if (lvl == 0) lvl = 1;
		
		// game
		
		const bob = this.bobber.point + (Math.sin(this.time * 0.05) * dt * 7);
		
		switch (this.state) {
			case "drawing":
				this.bobber.position.y = bob;
				
				const m = this.message;
				
				m.clearRect(0, this.pulltime, m.canvas.width, this.eraseSpeed);
				if (this.pulltime > -1) {
					this.pulltime -= this.eraseSpeed;
				}
				
				if (_controls.touch) {
					const rect = m.canvas.getBoundingClientRect();
					const scaleX = m.canvas.width / rect.width;
		      const scaleY = m.canvas.height / rect.height;
					const mouse = {
						x: (_controls.realPos.x-rect.left) * scaleX,
						y: (_controls.realPos.y-rect.top) * scaleY,
					};
					
					if (this.prevmouse) {
						// const a = this.prevmouse.x-mouse.x;
						// const b = this.prevmouse.y-mouse.y;
						// const dist = Math.sqrt(a*a + b*b)*10;
						// this.message.lineWidth = 100 * 1/dist;
						m.beginPath();
		        m.moveTo(this.prevmouse.x, this.prevmouse.y);
		        m.lineTo(mouse.x, mouse.y);
		        m.stroke();
		        m.closePath();
						this.ui.classList.remove("hidden");
					} else {
						play("marker");
					}
					
					this.prevmouse = {
						x: mouse.x,
						y: mouse.y
					};
				} else {
					this.prevmouse = null;
					stop("marker");
				}
				
				break;
			case "idle":
				this.bobber.position.y = bob;
				
				this.drawHistory(function(y) {
					c.fillText("기다리는 중...", width/2, y+50);
				});
				
				const rand = (Math.round(Math.random() * this.chance));
				if (this.time % rand == 0) {
					this.state = "wait";
					this.pulltime = 250;
				}
				break;
			case "wait":
				this.bobber.position.y = bob;
				
				this.drawHistory(function(y) {
					const width = c.canvas.width;
					c.fillText(Math.ceil(phone.pulltime/50), width/2, y+50);
				});
			
				if (this.pulltime <= 0) {
					this.pulltime = this.wintime * lvl/2;
					this.state = "pull";
					this.indicator.visible = true;
					assets.sounds.frequency.seek(0);
					play("frequency");
					assets.sounds.bite.seek(0);
					play("bite");
				}
				this.pulltime--;
				break;
			case "pull":
				this.indicator.position.y = 4 + Math.sin(this.time * 0.05 * lvl/2);
			
				if (_controls.touch) {
					this.velocity += 0.45;
				} else {
					this.velocity -= 0.6;
				}
				this.bobber.position.y += this.velocity * dt;
				
				if (this.bobber.position.y >= this.indicator.position.y-2 && this.bobber.position.y <= this.indicator.position.y+2) {
					this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
					this.pulltime--;
					
					this.drawHistory(function(y) {
						const width = c.canvas.width;
						c.fillRect(0, y, phone.pulltime/(phone.wintime * lvl/2) * width, 10);
					});
					
					if (this.pulltime < 0) {
						// win
						this.level++;
						stop("frequency");
				
						this.state = "idle";
						_camera.position.set(0, 5, 35);
						_camera.lookAt(0, 0, 0);
						_camera.position.y = 10;
						this.drawing_menu.classList.add("hidden");
						this.message.canvas.classList.add("hidden");
						this.ui.classList.add("hidden");
						this.pulltime = this.wintime;
						this.indicator.visible = false;
						window.socket.emit('imgrequest');
						
						let idsvisited = [];
						let randomid = window.imgs.length * Math.random() | 0;
						idsvisited.push(randomid);
						let available = true;
						while (!window.imgs[randomid].complete) {
							randomid++;
							
							if (randomid >= window.imgs.length) {
								randomid = 0;
							}
							
							idsvisited.push(randomid);
							
							if (idsvisited.length >= window.imgs.length) {
								break;
								available = false;
							}
						}
						
						if (available) {
							this.history.push(window.imgs[randomid]);
						}
						this.state = "win";
					}
				} else {
					this.drawHistory();
					
					this.bobber.material.emissive = null;
					this.pulltime = this.wintime * lvl/2;
					
					if (this.bobber.position.y <= -10 || this.bobber.position.y > 9.44335) {
						assets.sounds.lose.seek(0);
						play("lose");
						this.state = "lose";
						stop("frequency");
						this.velocity = 0;
						this.indicator.visible = false;
						this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
						if (this.level > window.player.wins.phone) {
							setScore("phone", this.level);
						}
						pause("phone", this.level);
						_controls.lockRotation = false;
						this.level = 0;
						window.socket.emit('imgrequest');
					}
				}
				break;
			case "win":
				assets.sounds.win.seek(0);
				play("win");
				this.velocity = 0;
				this.state = "idle";
				break;
		}
		
		this.time++;
	}
});
var pc = new scene({
	music: "alarm",
	init: function(group) {
		this.loadFromList([
			"floor",
			
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
			"pc",
			"pc_screen",
			
			"deer",
			
			"platform",
		]);
		
		this.loadLabels([
			{
				obj: "deer",
				text: PAUSE
			}
		]);
		
		const desk = this.group.getObjectByName("desk");
		const moveWithDesk = ["chair", "keyboar", "mouse", "pc", "pc_screen", "deer", "desk"];
		for (let name of moveWithDesk) {
			let obj = this.group.getObjectByName(name);
			obj.position.x -= desk.position.x;
			obj.position.z -= desk.position.z;
		}
		
		const platform = this.group.getObjectByName("platform");
		
		const texture = _texture_loader.load(assets.images.zoom.src);
		texture.encoding = THREE.sRGBEncoding;
		texture.flipY = false;
		platform.material.map = texture;
		
		const toplight = new THREE.PointLight(0xffe01c, 0.5);
		toplight.position.set(0, 70, 0);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
		
		group.add(new THREE.AmbientLight(0xffffff, 0.5));
		
		// cannon.js initialization
		
		var world = new CANNON.World();
		world.broadphase = new CANNON.NaiveBroadphase();
		world.gravity.set(0, -9.8, 0);
		this.density = 500;
		
		this.world = world;
		
		var box = new THREE.Box3().setFromObject(platform);
		platform.SIZE = {
			height: box.max.y-box.min.y,
			width: box.max.z-box.min.z,
			depth: box.max.x-box.min.x,
		};
		var shape = new CANNON.Box(new CANNON.Vec3(
			platform.SIZE.depth/2,
			platform.SIZE.height/2,
			platform.SIZE.width/2,
		));
		var body = new CANNON.Body({
			mass: this.density * shape.volume(),
			type: CANNON.Body.KINEMATIC,
			position: new CANNON.Vec3(0, platform.position.y, 0),
		});
		body.addShape(shape);
		body.children = [];
		body.SIZE = platform.SIZE;
		body.addEventListener("collide", function(e) {
			if (e.body.position.y > this.position.y) {
				// kinda weird but whatever
				let volume = ((e.contact.getImpactVelocityAlongNormal() - 1) / 29);
				assets.sounds.collision.seek(0);
				play("collision", volume);
				for (let child of this.children) {
					if (child.id == e.body.id) {
						return;
					}
				}
				
				this.children.push(e.body);
			}
		});
		platform.CANNON = body;
		
		this.checkContact = function(bodyA, bodyB) {
			for(var i=0; i<world.contacts.length; i++) {
	        var c = world.contacts[i];
	        if((c.bi === bodyA && c.bj === bodyB) || (c.bi === bodyB && c.bj === bodyA)) {
            return true;
	        }
		    }
		    return false;
		};
		
		// game
		
		this.randomBlocks = [
			"frog",
			"cat",
			"bear",
			"monkey",
			"snake",
		];
		
		this.createBlock = function(x) {
			if (x == undefined) {
				x = Math.ceil(Math.random() * this.dropWidth) * (Math.round(Math.random()) ? 1 : -1);
			}
			
			let name = this.randomBlocks[this.randomBlocks.length * Math.random() | 0];
			stop(name);
			play(name);
			
			var obj = assets.models[name];
			
			var mesh = new THREE.Mesh(obj.geometry.clone(), obj.material.clone());
			mesh.name = name;
			mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
			mesh.castShadow = obj.castShadow;
			mesh.receiveShadow = obj.receiveShadow;
			
			var box = new THREE.Box3().setFromObject(mesh);
			var height = box.max.y - box.min.y;
			var width = box.max.x - box.min.x;
			var depth = box.max.z - box.min.z;
			var shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
			var body = new CANNON.Body({
				mass: this.density * shape.volume(),
				position: new CANNON.Vec3(x, this.dropHeight, 0),
			});
			mesh.position.copy(body.position);
			body.children = [];
			body.addEventListener("collide", function(e) {
				if (e.body.position.y > this.position.y) {
					for (let child of this.children) {
						if (child.id == e.body.id) {
							return;
						}
					}
					this.children.push(e.body);
				}
			});
			body.addShape(shape);
			mesh.CANNON = body;
			mesh.TIME = 0;
			
			this.queue.push(mesh);
		};
		
		this.dropBlock = function(obj) {
			if (this.queue.length == 0) {
				this.createBlock();
			}
			obj = this.queue.shift();
			
			this.gamegroup.add(obj);
			this.active.push(obj);
			this.world.addBody(obj.CANNON);
		};
		
		this.platform = platform;
		this.gamegroup = new THREE.Group();
		this.group.add(this.gamegroup);
		
		this.dropHeight = 50;
		this.dropWidth = 10;
		this.threshold = 150;
		this.platformSpeed = 30;
		this.ground = 0;
	},
	withLoad: function() {
		this.loadLabels([
			{
				obj: "deer",
				text: PAUSE
			}
		]);
		
		this.reload = function() {
			_camera.position.set(0, 0, -60);
			_camera.lookAt(0, 0, 0);
			_camera.position.y = 20;
			_controls.lockRotation = true;
			
			this.group.rotation.y = 0;
			this.platform.CANNON.position.x = 0;
			
			this.state = "dropping";
			this.active = [];
			this.queue = [];
			this.group.remove(this.gamegroup);
			this.gamegroup = new THREE.Group();
			this.group.add(this.gamegroup);
			this.world.bodies = [this.platform.CANNON];
			
			stop("snake");
			stop("frog");
			stop("monkey");
			stop("bear");
			stop("cat");
			
			this.createBlock(0);
			this.dropBlock();
		};
		this.reload();
	},
	keys: ["deer"],
	key: function(obj) {
		switch (obj) {
			case "deer":
				this.state = "pause";
				pause("pc");
				_controls.lockRotation = false;
				break;
			case "unpause":
				unpause();
				
				for (let block of this.active) {
					if (block.CANNON.position.y < this.ground) {
						this.reload();
						break;
					}
				}
				
				this.state = "dropping";
				_controls.lockRotation = true;
				this.group.rotation.y = 0;
				break;
		}
	},
	update: function(dt) {
		switch (this.state) {
			case "dropping":
				// this.world.step(0.035);
				this.world.step(1/60, dt*2, 5);
				
				// blocks
				
				for (let block of this.active) {
					block.CANNON.CHANGE = block.CANNON.position.x - block.position.x;
				}
				
				for (let i=this.active.length-1; i>=0; i--) {
					let block = this.active[i];
					if (block.TIME > -1) {
						block.TIME++;
						if (block.TIME > this.threshold) {
							block.TIME = -1;
							this.dropBlock();
						}
					}
					if (block.CANNON.position.y < this.ground) {
						this.state = "lose";
						assets.sounds.lose.seek(0);
						play("lose");
						if (window.player.wins.pc < this.active.length-1) {
							setScore("pc", this.active.length-1);	
						}
						pause("pc", this.active.length-1);
						_controls.lockRotation = false;
					}
					
					for (let child of block.CANNON.children) {
						if (!pc.checkContact(block.CANNON, child)) {
							block.CANNON.children.splice(block.CANNON.children.indexOf(child), 1);
						} else {
							let offset = child.position.x - block.position.x;
							// child.position.x = block.CANNON.position.x + offset;
							child.position.x += block.CANNON.CHANGE;
						}
					}
					
					const q = block.CANNON.quaternion;
					block.rotation.set(q.x, q.y, q.z);
					block.position.copy(block.CANNON.position);
				}
				
				// platform
				
				var platform = this.platform.CANNON;
				const input = _controls.offset.x * this.platformSpeed;
				if (_controls.offset) {
					platform.position.x -= input;
					for (let child of platform.children) {
						if (!pc.checkContact(platform, child)) {
							platform.children.splice(platform.children.indexOf(child), 1);
						} else {
							let offset = child.position.x - this.platform.position.x;
							child.position.x = platform.position.x + offset;
						}
					}
				}
				this.platform.position.copy(platform.position);
				break;
			case "pause":
				break;
			default:
				this.group.rotation.y -= 0.01;
				break;
		}
		_controls.offset.set(0, 0);
	}
});
var games = {
	pause: {
		title: "게임을 종료할까요?",
		preview: new preview({
			init: function(group) {
				let center = "deer";
				const load = [
					"deer"
				];
				center = assets.models[center];
				for (const name of load) {
					var obj = assets.models[name];
					var mesh = new THREE.Mesh(obj.geometry.clone(), obj.material.clone());
					mesh.name = name;
					mesh.position.set(obj.position.x-center.position.x, obj.position.y-center.position.y, obj.position.z-center.position.z);
					mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
					mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
					mesh.castShadow = obj.castShadow;
					mesh.receiveShadow = obj.receiveShadow;
					this.group.add(mesh);
				}
				const toplight = new THREE.SpotLight(0xffe01c, 0.75);
				toplight.position.set(0, 0, 10);
				toplight.lookAt(0, 0, 0);
				toplight.castShadow = true;
				toplight.shadow.bias = SHADOW_BIAS;
				group.add(toplight);
			},
			withLoad: function() {
				_preview_camera.position.set(0, 0, 13);
				_preview_camera.lookAt(0, 0, 0);
				this.group.rotation.y = -HALF_PI;
			},
			update: function() {
				this.group.rotation.y += 0.01;
			},
		}),
		load: function() { bedroom.load(); }
	},
	phone: {
		title: "SNS에서 대화할 친구를 찾아<br>낚싯줄을 던졌다",
		preview: new preview({
			init: function(group) {
				let center = "phone_case";
				const load = [
					"phone_case",
					"phone_screen"
				];
				
				center = assets.models[center];
				for (const name of load) {
					var obj = assets.models[name];
					var mesh = new THREE.Mesh(obj.geometry.clone(), obj.material.clone());
					mesh.name = name;
					mesh.position.set(obj.position.x-center.position.x, obj.position.y-center.position.y, obj.position.z-center.position.z);
					mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
					mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
					mesh.castShadow = obj.castShadow;
					mesh.receiveShadow = obj.receiveShadow;
					this.group.add(mesh);
				}
				const toplight = new THREE.SpotLight(0xffe01c, 0.75);
				toplight.position.set(0, 13, 0);
				toplight.lookAt(0, 0, 0);
				toplight.castShadow = true;
				toplight.shadow.bias = SHADOW_BIAS;
				group.add(toplight);
				
				group.scale.set(2, 2, 2);
			},
			withLoad: function() {
				_preview_camera.position.set(0, 10, 1);
				_preview_camera.lookAt(0, 0, 0);
				this.group.rotation.z = 0;
				this.group.rotation.y = -Math.PI;
			},
			update: function() {
				this.group.rotation.z += 0.01;
				this.group.rotation.y += 0.01;
			}
		}),
		load: function() { phone.load(); }
	},
	pc: {
		title: "집중력이 무너지는 것을<br>바라보기만 할 순 없었다",
		preview: new preview({
			init: function(group) {
				let center = "pc";
				const load = [
					"pc",
					"pc_screen"
				];
				
				center = assets.models[center];
				for (const name of load) {
					var obj = assets.models[name];
					var mesh = new THREE.Mesh(obj.geometry.clone(), obj.material.clone());
					mesh.name = name;
					mesh.position.set(obj.position.x-center.position.x, obj.position.y, obj.position.z-center.position.z);
					mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
					mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
					mesh.castShadow = obj.castShadow;
					mesh.receiveShadow = obj.receiveShadow;
					this.group.add(mesh);
				}
				const toplight = new THREE.SpotLight(0xffe01c, 0.75);
				toplight.position.set(0, 13, 0);
				toplight.lookAt(0, 0, 0);
				toplight.castShadow = true;
				toplight.shadow.bias = SHADOW_BIAS;
				group.add(toplight);
			},
			withLoad: function() {
				_preview_camera.position.set(0, 10, 35);
				_preview_camera.lookAt(0, 0, 0);
				_preview_camera.position.set(0, 10, 10);
				this.group.rotation.y = -Math.PI;
			},
			update: function() {
				this.group.rotation.y += 0.01;
			}
		}),
		load: function() { pc.load(); }
	},
};

window.onload = function() {
	init();
};
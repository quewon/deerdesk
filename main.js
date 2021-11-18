import {GLTFLoader} from "./lib/GLTFLoader.js";
import {EffectComposer} from "./lib/EffectComposer.js";
import {RenderPass} from "./lib/RenderPass.js";
import {UnrealBloomPass} from "./lib/UnrealBloomPass.js";
import {BokehPass} from './lib/BokehPass.js';

var HALF_PI = Math.PI / 2;
var SHADOW_BIAS = -0.0002;

var _width, _height;
var _renderer, _camera, _raycaster, _composer;
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
	update: function() {
		if (_controls.offset) {
			if (_controls.offset.x > 0 || _controls.offset.y > 0) {
				let offsetX = _controls.offset.x * 0.05;
				let offsetY = _controls.offset.y * 0.05;

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
	// 	maxblur: 0.01,
	// 	// width: _width,
	// 	// height: _height,
  // }));

	_raycaster = new THREE.Raycaster();
	
	//
	
	_scene.add(new THREE.AmbientLight(0xf2c46f, 0.2));
	_preview.add(new THREE.AmbientLight(0xf2c46f, 0.25));

	// controls

	_container.addEventListener("mousedown", function() {
		_controls.touch = true;
	});
	_container.addEventListener("mousemove", function(e) {
		_controls.move(e);
	});
	_container.addEventListener("touchstart", function(e) {
		_controls.touch = true;
		_controls.move(e);
	});
	_container.addEventListener("touchmove", function(e) {
		_controls.move(e);
	});
	_container.addEventListener("mouseup", function(e) {
		_controls.select(e);
	});
	_container.addEventListener("touchend", function(e) {
		_controls.select(e);
	});
	_container.addEventListener("touchcancel", function(e) {
		_controls.select(e);
	});
	_container.addEventListener("blur", function(e) {
		_controls.select(e);
	});
	window.addEventListener("resize", getSize);
	document.oncontextmenu = function() {
		return false;
	};

	//
	
	init_scenes();
	draw();
	
	//
	
	document.getElementById("loading").classList.add("hidden");
}

function draw() {
	_current_scene.update();
	if (_current_preview) _current_preview.update();
	_controls.update();

	// render

	_renderer.render(_scene, _camera);
	// _composer.render();
	_preview_renderer.render(_preview, _preview_camera);

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

	// move action

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
	_height = document.documentElement.clientHeight;
	_width = document.documentElement.clientWidth;
	
	let prevsize;

	if (_height <= _width) {
		_controls.speed = _controls.speedFactor * _width / 1000;
		prevsize = _height/3;
	} else {
		_controls.speed = _controls.speedFactor * _height / 1000;
		prevsize = _width/3;
	}
	
	_camera.aspect = _width / _height;
  _camera.updateProjectionMatrix();
	
	_preview_camera.aspect = 1;
  _preview_camera.updateProjectionMatrix();

	_renderer.setSize( _width, _height );
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

		ref.push(this);
	}

	load() {
		game();
		
		if (this.neverLoaded) {
			this.init(this.group);
			this.neverLoaded = false;
		}
		
		if (_current_scene) {
			_current_scene.group.visible = false;
		}

		this.group.visible = true;

		_current_scene = this;
		
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

function pause(name) {
	game("pause");
	const button = document.querySelector("#gameintro button");
	button.onclick = button.ontouchend = function() {
		endgame(name);
	}
}

function endgame(name) {
	switch (name) {
		case "phone":
			phone.drawing_menu.classList.add("hidden");
			phone.message.canvas.classList.add("hidden");
			phone.ui.classList.add("hidden");
			break;
	}
	
	bedroom.load();
	// game(name);
}

function game(name) {
	const intro = document.getElementById("gameintro");
	const lf = "◍";
	const le = "◌";
	
	if (name) {
		const game = games[name];
		intro.classList.remove("hidden");
		
		let span = intro.querySelector("span");
		let button = intro.querySelector("button");
		let levels = intro.querySelector("div");
		
		span.innerHTML = game.title;
		if (name != "pause") {
			button.onclick = button.ontouchend = function() { games[name].load(); };
		}
		
		levels.textContent = "";
		for (let i=1; i<=5; i++) {
			if (i <= window.player.wins[name]) {
				levels.textContent += lf+" ";
			} else {
				levels.textContent += le+" ";
			}
		}
		
		game.preview.load();
		_controls.lockRotation = true;
		
		document.getElementById("message_made").classList.add("hidden");
		levels.classList.remove("hidden");
		button.textContent = "시작하기";
		switch (name) {
			case "phone":
				if (window.player.messages.length > 0) {
					document.getElementById("message_made").classList.remove("hidden");
				}
				break;
			case "pause":
				button.textContent = "방으로 돌아가기";
				levels.classList.add("hidden");
				break;
		}
	} else {
		intro.classList.add("hidden");
		_controls.lockRotation = false;
	}
}

function init_scenes() {
	bedroom.load();
	
	console.log("all scenes loaded.");
}

//

var assets = {
	models: {
		"bedroom": "models/bedroom.glb",
		"phone": "models/phone.glb",
		"pc": "models/pc.glb",
	},
	images: {
		"texture": "images/palette.png",
	},
	sounds: {
		"alarm": { src: "sounds/alarm.wav", loop: true },
	},
};
var bedroom = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
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
		];
		
		this.loadFromList(load);
		
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
		_camera.position.set(0, 10, 35);
		_camera.lookAt(0, 0, 0);
		_camera.position.y = 15;
	},
	key: function(obj) {
		switch (obj) {
			case "3":
			case "6":
			case "9":
			case "12":
			case "hour_hand":
			case "minute_hand":
			case "clock_lines":
			case "clock":
				game("clock");
				break;
			case "phone_case":
			case "phone_screen":
				game("phone");
				break;
			case "pc":
			case "pc_screen":
				game("pc");
				break;
			default:
				game();
				break;
		}
	}
});
var phone = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
			"bobber",
			"fishing_phone",
			"pool",
			
			"screen",
			"screen_back",
			
			"deer"
		];
		
		this.loadFromList(load);
		
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
		let scale = _height/600;
		this.message.canvas.style.width = this.message.canvas.width*scale+"px";
		this.message.canvas.style.height = this.message.canvas.height*scale+"px";
		this.message.canvas.style.zIndex = 10;
		this.message.canvas.style.marginLeft = 11*scale+"px";
		this.message.canvas.style.borderRadius = "2em";
		this.message.canvas.classList.add("centered");
		_container.appendChild(this.message.canvas);
		this.message.strokeStyle = "white";
		this.message.lineWidth = 5;
		this.message.lineCap = "round";
		this.message.imageSmoothingEnabled = false;
		
		this.ui = document.createElement("div");
		this.ui.id = "phone_ui";
		let button = document.createElement("button");
		button.textContent = "완료";
		let eraser = document.createElement("button");
		eraser.textContent = "전부 지우기";
		button.onclick = button.ontouchend = function() {
			if (window.player.messages.length == 0) {
				let button = document.getElementById("message_made");
				button.onclick = button.ontouchend = function() {
					phone.load();
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
			let img = document.createElement("img");
			img.src = phone.message.canvas.toDataURL();
			window.player.messages.push(img);
			
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
		};
		this.ui.appendChild(eraser);
		this.ui.appendChild(button);
		this.ui.classList.add("centered");
		document.body.appendChild(this.ui);
		
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
	},
	withLoad: function() {
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
			this.state = "idle";
			_camera.position.set(0, 5, 35);
			_camera.lookAt(0, 0, 0);
			_camera.position.y = 10;
			this.drawing_menu.classList.add("hidden");
			this.message.canvas.classList.add("hidden");
			this.ui.classList.add("hidden");
			this.group.rotation.y = HALF_PI - 0.25;
			this.pulltime = this.wintime;
			_controls.lockRotation = false;
		}
		this.eraseSpeed = 3;
	},
	key: function(obj) {
		switch (obj) {
			case "deer":
				if (this.state != "pull" && this.state != "wait") {
					if (this.level > window.player.wins.phone) {
						window.player.wins.phone = this.level;
					}
					pause("phone");
				}
				break;
		}
	},
	update: function() {
		const c = this.context;
		const width = c.canvas.width;
		const height = c.canvas.height;
		
		c.clearRect(0, 0, width, height);
		this.texture.needsUpdate = true;
		
		let lvl = this.level;
		if (lvl == 0) lvl = 1;
		
		// game
		
		switch (this.state) {
			case "drawing":
				this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
				
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
					}
					
					this.prevmouse = {
						x: mouse.x,
						y: mouse.y
					};
				} else {
					this.prevmouse = null;
				}
				
				break;
			case "idle":
				this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
				
				const rand = (Math.round(Math.random() * this.chance));
				if (this.time % rand == 0) {
					// alert("화면을 눌러서 낚시찌를 파란 공간 안으로 끌어당기세요!");
					this.state = "wait";
					this.pulltime = 250;
				}
				break;
			case "wait":
				this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
			
				// c.fillText("낚시찌를 파란 공간", width/2, 50);
				// c.fillText("안으로 끌어당겨서", width/2, 100);
				// c.fillText("관심을 끌었다", width/2, 150);
				c.fillText(Math.ceil(this.pulltime/50), width/2, 50);
				if (this.pulltime <= 0) {
					this.pulltime = this.wintime * lvl/2;
					this.state = "pull";
					this.indicator.visible = true;
				}
				this.pulltime--;
				break;
			case "pull":
				this.indicator.position.y = 4 + Math.sin(this.time * 0.05 * lvl/2);
			
				if (_controls.touch) {
					this.velocity += 0.005;
				} else {
					this.velocity -= 0.01;
					if (this.velocity < -0.2) { this.velocity = -0.2; }
				}
				this.bobber.position.y += this.velocity;
				
				if (this.bobber.position.y >= this.indicator.position.y-2 && this.bobber.position.y <= this.indicator.position.y+2) {
					this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
					this.pulltime--;
					c.fillRect(0, 0, this.pulltime/(this.wintime * lvl/2) * width, 10);
					
					if (this.pulltime < 0) {
						// win
						this.level++;
				
						this.state = "idle";
						_camera.position.set(0, 5, 35);
						_camera.lookAt(0, 0, 0);
						_camera.position.y = 10;
						this.drawing_menu.classList.add("hidden");
						this.message.canvas.classList.add("hidden");
						this.ui.classList.add("hidden");
						this.pulltime = this.wintime;
						this.indicator.visible = false;
					}
				} else {
					this.bobber.material.emissive = null;
					this.pulltime = this.wintime * lvl/2;
					
					if (this.bobber.position.y <= -10 || this.bobber.position.y > 9.44335) {
						this.state = "lose";
						this.indicator.visible = false;
						this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
						if (this.level > window.player.wins.phone) {
							window.player.wins.phone = this.level;
						}
						pause("phone");
						_controls.lockRotation = false;
					}
				}
				break;
			case "lose":
				break;
		}
		
		this.time++;
	}
});
var pc = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
			"floor",
			
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
			"pc",
			"pc_screen",
			
			"deer",
			
			"platform",
		];
		
		this.loadFromList(load);
		
		const desk = this.group.getObjectByName("desk");
		const moveWithDesk = ["chair", "keyboar", "mouse", "pc", "pc_screen", "deer", "desk"];
		for (let name of moveWithDesk) {
			let obj = this.group.getObjectByName(name);
			obj.position.x -= desk.position.x;
			obj.position.z -= desk.position.z;
		}
		
		const platform = this.group.getObjectByName("platform");
		platform.material = new THREE.MeshPhysicalMaterial({
			transparent: true,
			opacity: 1,
			transmission: 0.5,
			roughness: 0,
			specularIntensity: 0.5,
			ior: 1,
			reflectivity: 0.5,
			color: 0x00ffff,
			emissive: 0x00ffff,
		});
		
		const toplight = new THREE.PointLight(0xffe01c, 0.75);
		toplight.position.set(0, 70, 0);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
		
		// cannon.js initialization
		
		var world = new CANNON.World();
		world.broadphase = new CANNON.NaiveBroadphase();
		world.gravity.set(0, -9.8/2, 0);
		
		this.blockmat = new CANNON.Material("groundMaterial");
		var groundmat = new CANNON.Material("groundMaterial");
    world.addContactMaterial(new CANNON.ContactMaterial(this.blockmat, groundmat, {
			friction: 10,
      restitution: 0.2,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 10,
      frictionEquationStiffness: 1e8,
      frictionEquationRegularizationTime: 3,
		}));
		world.addContactMaterial(new CANNON.ContactMaterial(this.blockmat, this.blockmat, {
			friction: 15,
      restitution: 0.2,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
      frictionEquationStiffness: 1e8,
      frictionEquationRegularizationTime: 3,
		}));
		
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
			mass: 2515 * shape.volume(),
			type: CANNON.Body.KINEMATIC,
			position: new CANNON.Vec3(0, platform.position.y, 0),
			material: groundmat,
		});
		body.addShape(shape);
		body.children = [];
		body.SIZE = platform.SIZE;
		body.addEventListener("collide", function(e) {
			if (e.body.position.y > this.position.y) {
				for (let child of this.children) {
					if (child.id == e.body.id) {
						return;
					}
				}
				
				this.children.push(e.body);
				e.body.parent = this;
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
			"chair",
			"pc",
			"deer",
			"desk",
			"clock",
		];
		
		this.createBlock = function(x) {
			// const obj = assets.models[this.randomBlocks[this.randomBlocks.length * Math.random() | 0]];
			
			var width, height, depth;
			// var height = 1;
			width = height = depth = platform.SIZE.depth/3;
			// var depth = 1;
			var mesh = new THREE.Mesh(
				new THREE.BoxGeometry(depth, height, width),
				new THREE.MeshPhysicalMaterial({
					transparent: true,
					opacity: 1,
					transmission: 0.5,
					roughness: 0,
					specularIntensity: 0.5,
					ior: 1,
					reflectivity: 0.5,
					color: 0x00ffff,
					emissive: 0x00ffff,
				}),
			);
			var shape = new CANNON.Box(new CANNON.Vec3(depth/2, height/2, width/2));
			var body = new CANNON.Body({
				mass: 200 * shape.volume(),
				position: new CANNON.Vec3(x, this.dropHeight, 0),
				material: this.blockmat,
			});
			mesh.position.copy(body.position);
			body.children = [];
			body.addEventListener("collide", function(e) {
				if ((e.body.position.y > this.position.y) && !('parent' in e.body)) {
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
		
		this.dropBlock = function(x) {
			x = x || Math.ceil(Math.random() * this.dropWidth) * (Math.round(Math.random()) ? 1 : -1);
			
			this.createBlock(x);
			
			const obj = this.queue.shift();
			this.gamegroup.add(obj);
			this.active.push(obj);
			this.world.addBody(obj.CANNON);
			
			console.log("block deployed");
		};
		
		this.platform = platform;
		this.gamegroup = new THREE.Group();
		this.group.add(this.gamegroup);
		
		this.dropHeight = 50;
		this.dropWidth = 10;
		this.threshold = 150;
		this.ground = 0;
	},
	withLoad: function() {
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
			
			this.dropBlock();
		};
		this.reload();
	},
	key: function(obj) {
		switch (obj) {
			case "deer":
				this.state = "pause";
				pause("pc");
				_controls.lockRotation = false;
				break;
		}
	},
	update: function() {
		switch (this.state) {
			case "dropping":
				this.world.step(0.05);
				
				// blocks
				
				for (let i=this.active.length-1; i>=0; i--) {
					let block = this.active[i];
					if (block.TIME > -1) {
						block.TIME++;
						if (block.TIME > this.threshold) {
							block.TIME = -1;
							this.dropBlock();
							
							var points = Math.floor(this.active.length/2);
							if (window.player.wins.pc < points) {
								window.player.wins.pc = points;
								console.log(this.active.length, points);
							}
						}
					}
					if (block.CANNON.position.y < this.ground) {
						this.state = "lose";
						pause("pc");
						_controls.lockRotation = false;
					}
					
					for (let child of block.CANNON.children) {
						if (!pc.checkContact(block.CANNON, child)) {
							block.CANNON.children.splice(block.CANNON.children.indexOf(child), 1);
							delete child.parent;
						} else {
							let offset = child.position.x - block.position.x;
							child.position.x = block.CANNON.position.x + offset;
						}
					}
					
					const q = block.CANNON.quaternion;
					block.rotation.set(q.x, q.y, q.z);
					block.position.copy(block.CANNON.position);
				}
				
				// platform
				
				var platform = this.platform.CANNON;
				const input = _controls.offset.x * _controls.speed * 10;
				if (_controls.offset) {
					platform.position.x -= input;
					// if (platform.position.x < -this.dropWidth) {
					// 	platform.position.x = -this.dropWidth;
					// } else if (platform.position.x > this.dropWidth) {
					// 	platform.position.x = this.dropWidth;
					// }
					
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
			default:
				this.group.rotation.y -= 0.01;
				break;
		}
		_controls.offset.set(0, 0);
	}
});
var clock = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
			"floor",
			
			"computer_plug",
			"pc",
			"pc_screen",
			
			"deer"
		];
		
		this.loadFromList(load);
		
		const toplight = new THREE.SpotLight(0xffe01c, 0.75);
		toplight.position.set(0, 13, 0);
		toplight.lookAt(0, 0, 0);
		toplight.castShadow = true;
		toplight.shadow.bias = SHADOW_BIAS;
		group.add(toplight);
	},
	key: function(obj) {
		switch (obj) {
			
		}
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
	clock: {
		title: "과제가 쌓인 오후<br>시간 관리가 필요했다",
		preview: new preview({
			init: function(group) {
				let center = "clock";
				const load = [
					"3",
					"6",
					"9",
					"12",
					"hour_hand",
					"minute_hand",
					"clock_lines",
					"clock",
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
		load: function() { clock.load(); }
	},
};

window.onload = function() {
	init();
};
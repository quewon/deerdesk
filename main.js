import {GLTFLoader} from "./lib/GLTFLoader.js";

var HALF_PI = Math.PI / 2;
var SHADOW_BIAS = -0.0002;

var _width, _height;
var _renderer, _camera, _raycaster;
var _preview_renderer, _preview_camera;
var _loader = new GLTFLoader();
var _texture_loader = new THREE.TextureLoader();
var _scene = new THREE.Scene();
var _preview = new THREE.Scene();
var _canvas = document.querySelector("canvas");
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

				_current_scene.group.rotation.y += offsetX;
				// _current_scene.group.rotation.x -= offsetY;

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
		var imgs = {};
		let imgcounter = 0;
		
		const texture = _texture_loader.load("images/palette.png");
		texture.encoding = THREE.sRGBEncoding;
		texture.flipY = false;
		
		for (const name in assets.images) {
			imgcounter++;
			_loader.load(assets.images[name], function(gltf) {
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
					imgs[child.name] = child;
				}
				
				imgcounter--;
				if (imgcounter == 0) {
					assets.images = imgs;
					console.log("all images loaded.");
					init_3d();
				}
			});
		}
	}
}

function init_3d() {
	_renderer = new THREE.WebGLRenderer({ alpha: true });
	_preview_renderer = new THREE.WebGLRenderer({ alpha: true });
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
	document.body.appendChild( _renderer.domElement );
	
	_preview_renderer.outputEncoding = THREE.sRGBEncoding;
	_preview_renderer.shadowMap.enabled = true;
	_preview_renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	_preview_renderer.setPixelRatio(window.devicePixelRatio * 2);
	const intro = document.getElementById("gameintro");
	intro.replaceChild(_preview_renderer.domElement, intro.querySelector("canvas"));

	_raycaster = new THREE.Raycaster();
	
	//
	
	_scene.add(new THREE.AmbientLight(0xf2c46f, 0.2));
	_preview.add(new THREE.AmbientLight(0xf2c46f, 0.25));

	// controls

	document.addEventListener("mousedown", function() {
		_controls.touch = true;
	});
	document.addEventListener("mousemove", function(e) {
		_controls.move(e);
	});
	document.addEventListener("touchstart", function(e) {
		_controls.touch = true;
		_controls.move(e);
	});
	document.addEventListener("touchmove", function(e) {
		_controls.move(e);
	})
	document.addEventListener("mouseup", function(e) {
		_controls.select(e);
	});
	document.addEventListener("touchend", function(e) {
		_controls.select(e);
	});
	document.addEventListener("touchcancel", function(e) {
		_controls.select(e);
	});
	document.addEventListener("blur", function(e) {
		_controls.select(e);
	});
	window.addEventListener("resize", getSize);
	document.oncontextmenu = function() {
		return false
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
	if (_controls.touch && !_controls.lockRotation) {
		_controls.offset.set(
			(_controls.pos.x - _controls.prevPos.x) * _controls.speed,
			(_controls.pos.y - _controls.prevPos.y) * _controls.speed
		);

		_current_scene.group.rotation.y += _controls.offset.x;
		// _current_scene.group.rotation.x -= _controls.offset.y;

		// _current_scene.group.rotation.x = cap(_current_scene.group.rotation.x, -HALF_PI, HALF_PI);
	}

	// move action

}

function normalizedMousePosition(x, y) {
	const rect = _renderer.domElement.getBoundingClientRect();

	return {
		x: ((x - rect.left) / rect.width * 2) - 1,
		y: - ((y - rect.top) / rect.height * 2) + 1,
	}
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
}

function cap(value, min, max) {
	if (value < min) {
		return min
	}

	if (value > max) {
		return max
	}

	return value
}

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
	_canvas.width = _width;
	_canvas.height = _height;
}

function getMousePosition( dom, x, y ) {
	const rect = dom.getBoundingClientRect();
	return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];
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
		
		this.withLoad();
		
		if (_current_scene) {
			_current_scene.group.visible = false;
		}

		this.group.visible = true;

		_current_scene = this;
	}
	
	loadFromList(load) {
		for (const name of load) {
			var obj = assets.images[name];
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

function game(name) {
	const intro = document.getElementById("gameintro");
	
	if (name) {
		const game = games[name];
		intro.classList.remove("hidden");
		
		let span = intro.querySelector("span");
		let canvas = intro.querySelector("canvas");
		let button = intro.querySelector("button");
		
		span.innerHTML = game.title;
		button.onclick = button.ontouchend = function() { games[name].load() };
		
		game.preview.load();
		_controls.lockRotation = true;
		
		if (name == "phone" && window.player.messages.length > 0) {
			document.getElementById("message_made").classList.remove("hidden");
		} else {
			document.getElementById("message_made").classList.add("hidden");
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

window.onload = function() {
	init();
};

//

var assets = {
	images: {
		"bedroom": "images/bedroom.glb",
		"phone": "images/phone.glb",
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
		screen.material.emissive = screen2.material.emissive = assets.images["pc_screen"].material.emissive;
		this.context.strokeStyle = "#00ffff";
		this.context.lineWidth = 2;
		this.context.textAlign = "center";
		this.context.font = "40px monospace";
		this.texture.minFilter = THREE.LinearFilter;
		
		this.drawing_menu = document.getElementById("drawing_menu");
		this.message = document.createElement("canvas").getContext("2d");
		this.message.canvas.width = this.context.canvas.width-20;
		this.message.canvas.height = this.context.canvas.height/2-120;
		this.message.canvas.style.width = this.message.canvas.width+100+"px";
		this.message.canvas.style.height = this.message.canvas.height+100+"px";
		this.message.canvas.style.zIndex = 10;
		this.message.canvas.style.marginLeft = "10px";
		this.message.canvas.style.borderRadius = "2em";
		this.message.canvas.classList.add("centered");
		document.body.appendChild(this.message.canvas);
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
				}
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
		
		const toplight = new THREE.PointLight(0xffffff, 0.5);
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
		}
	},
	key: function(obj) {
		switch (obj) {
			
		}
	},
	update: function() {
		const c = this.context;
		const width = c.canvas.width;
		const height = c.canvas.height;
		
		c.clearRect(0, 0, width, height);
		this.texture.needsUpdate = true;
		
		// game
		
		switch (this.state) {
			case "drawing":
				this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
				
				const m = this.message;
				
				m.clearRect(0, this.pulltime, m.canvas.width, 1);
				if (this.pulltime > -1) {
					this.pulltime--;
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
					this.indicator.visible = true;
					this.pulltime = 250;
				}
				break;
			case "wait":
				this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
			
				c.fillText("낚시찌를 파란 공간", width/2, 50);
				c.fillText("안으로 끌어당겨서", width/2, 100);
				c.fillText("관심을 끌었다", width/2, 150);
				c.fillText(Math.ceil(this.pulltime/50), width/2, 200);
				if (this.pulltime <= 0) {
					this.pulltime = this.wintime;
					this.state = "pull";
				}
				this.pulltime--;
				break;
			case "pull":
				this.indicator.position.y = 4 + Math.sin(this.time * 0.05);
			
				if (_controls.touch) {
					this.velocity += 0.005;
				} else {
					this.velocity -= 0.01;
					if (this.velocity < -0.2) { this.velocity = -0.2 }
				}
				this.bobber.position.y += this.velocity;
				
				if (this.bobber.position.y >= this.indicator.position.y-2 && this.bobber.position.y <= this.indicator.position.y+2) {
					this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
					this.pulltime--;
					c.fillRect(0, 0, this.pulltime/this.wintime * width, 10);
					
					if (this.pulltime < 0) {
						alert("성공적으로 낚시했습니다.");
						this.state = "win";
					}
				} else {
					this.bobber.material.emissive = null;
					this.pulltime = this.wintime;
					
					if (this.bobber.position.y <= -10 || this.bobber.position.y > 9.44335) {
						this.state = "lose";
						this.indicator.visible = false;
						this.bobber.material.emissive = {r:0, g:1, b:1, isColor: true};
					}
				}
				break;
			case "lose":
				// this.bobber.position.y = this.bobber.point + Math.sin(this.time * 0.05)/8;
				this.time = -100;
				this.state = "idle";
				break;
			case "win":
				bedroom.load();
				break;
		}
		
		this.time++;
	}
});
var pc = new scene({
	music: "alarm",
	init: function(group) {
		const load = [
			"chair",
			"desk",
			"keyboar",
			"mouse",
			
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
	phone: {
		title: "SNS에서 대화할 친구를 찾아<br>낚싯줄을 던졌다",
		preview: new preview({
			init: function(group) {
				let center = "phone_case";
				const load = [
					"phone_case",
					"phone_screen"
				];
				
				center = assets.images[center];
				for (const name of load) {
					var obj = assets.images[name];
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
		load: function() { phone.load() }
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
				
				center = assets.images[center];
				for (const name of load) {
					var obj = assets.images[name];
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
		load: function() { pc.load() }
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
				
				center = assets.images[center];
				for (const name of load) {
					var obj = assets.images[name];
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
		load: function() { clock.load() }
	},
}
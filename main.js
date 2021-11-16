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
var _controls = {
	touch: false,
	pos: new THREE.Vector2(),
	prevPos: null,
	offset: new THREE.Vector2(),
	speedFactor: 3.5,
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
	_camera.position.set(0, 10, 35);
	_camera.lookAt(0, 0, 0);
	_camera.position.y += 5;
	
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
	
	_scene.add(new THREE.AmbientLight(0xf2c46f, 0.25));
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
		// _height = height;
		// _width = height;/9*16;
		_controls.speed = _controls.speedFactor * _height / 1000;
		prevsize = _height/3;
	} else {
		// _height = width;/16*9;
		// _width = width;
		_controls.speed = _controls.speedFactor * _width / 1000;
		prevsize = _width/3;
	}
	
	_camera.aspect = _width / _height;
  _camera.updateProjectionMatrix();
	
	_preview_camera.aspect = 1;
  _preview_camera.updateProjectionMatrix();

	_renderer.setSize( _width, _height );
	_preview_renderer.setSize(prevsize, prevsize);
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

//

var assets = {
	images: {
		"bedroom": "images/bedroom.glb",
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
			"phone_case",
			"phone_screen",
			
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
		title: "시간 관리가 필요했다",
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

function game(name) {
	const intro = document.getElementById("gameintro");
	
	if (name) {
		const game = games[name];
		intro.classList.remove("hidden");
		
		let span = intro.querySelector("span");
		let canvas = intro.querySelector("canvas");
		let button = intro.querySelector("button");
		
		span.innerHTML = game.title;
		button.addEventListener("click", function() {
			games[name].load();
		});
		button.addEventListener("touchend", function() {
			games[name].load();
		});
		
		game.preview.load();
		_controls.lockRotation = true;
	} else {
		intro.classList.add("hidden");
		_controls.lockRotation = false;
	}
}

function init_scenes() {
	bedroom.load();
	
	console.log("all scenes loaded.");
}

export { phone, pc, clock }

window.onload = function() {
	init();
};
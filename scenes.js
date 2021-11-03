var assets = {
	images: {
		"deer": "images/deer.png",
		"forest": "images/forest.png",
	},
	sounds: {
		"alarm": { src: "sounds/alarm.wav", loop: true },
	},
};
var ref = [];

class scene {
	constructor(p) {
		this.id = ref.length;
		this.objects = p.objects;

		var group = new THREE.Group();
		for (let object in this.objects) {
			group.add(object);
		}
		group.visible = false;
		_scene.add(group);

		this.group = group;

		ref.push(this);
	}

	load() {
		// currentscene.group.visible = false;

		this.group.visible = true;
	}
}

class object {
	constructor(p) {
		
	}
}

// var phone = new scene({
// 	music: "alarm",
// 	objects: [
// 	],
// });

// var bedroom = new scene({
// 	objects: [
// 		new object({
// 			src: "deer.png",
// 			pos: [0, 0],
// 		})
// 	],
// });
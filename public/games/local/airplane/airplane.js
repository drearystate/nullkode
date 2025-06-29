
var Colors = {
	red:0xf25346,
	yellow:0xedeb27,
	white:0xd8d0d1,
	brown:0x59332e,
	pink:0xF5986E,
	brownDark:0x23190f,
	blue:0x68c3c0,
	green:0x458248,
	purple:0x551A8B,
	lightgreen:0x629265,
};

// GLTF Loader for 3D models
var loader;
var treeModels = []; // Will store the loaded tree models
var modelsLoaded = false;

// Initialize loader when GLTFLoader is available
function initLoader() {
  if (typeof THREE.GLTFLoader !== 'undefined') {
    loader = new THREE.GLTFLoader();
  } else if (typeof GLTFLoader !== 'undefined') {
    loader = new GLTFLoader();
  } else {
    console.error('GLTFLoader not found');
    modelsLoaded = true; // Skip loading, use fallback
  }
}



var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH, renderer, container;


function createScene() {
	// Get the width and height of the screen
	// and use them to setup the aspect ratio
	// of the camera and the size of the renderer.
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;

	// Create the scene.
	scene = new THREE.Scene();

	// Add FOV Fog effect to the scene. Same colour as the BG int he stylesheet.
	scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);

	// Create the camera
	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
	);
	// Position the camera
	camera.position.x = 0;
	camera.position.y = 150;
	camera.position.z = 100;	

	// Create the renderer

	renderer = new THREE.WebGLRenderer ({
	// Alpha makes the background transparent, antialias is performant heavy
		alpha: true,
		antialias:true
	});

	//set the size of the renderer to fullscreen
	renderer.setSize (WIDTH, HEIGHT);
	//enable shadow rendering
	renderer.shadowMap.enabled = true;

	// Add the Renderer to the DOM, in the world div.
	container = document.getElementById('world');
	container.appendChild (renderer.domElement);

	//RESPONSIVE LISTENER
	window.addEventListener('resize', handleWindowResize, false);
}

//RESPONSIVE FUNCTION
function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}


var hemispshereLight, shadowLight;

function createLights(){
	// Gradient coloured light - Sky, Ground, Intensity
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)
	// Parallel rays
	shadowLight = new THREE.DirectionalLight(0xffffff, .9);



	shadowLight.position.set(0,350,350);
	shadowLight.castShadow = true;

	// define the visible area of the projected shadow
	shadowLight.shadow.camera.left = -650;
	shadowLight.shadow.camera.right = 650;
	shadowLight.shadow.camera.top = 650;
	shadowLight.shadow.camera.bottom = -650;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;

	// Shadow map size
	shadowLight.shadow.mapSize.width = 2048;
	shadowLight.shadow.mapSize.height = 2048;

	// Add the lights to the scene
	scene.add(hemisphereLight);  

	scene.add(shadowLight);
}	


Land = function(){
	var geom = new THREE.PlaneGeometry(2000,2000,40,40);
	//rotate on the x axis to make it horizontal
	geom.rotateX(-Math.PI/2);
	//create a material
	var mat = new THREE.MeshPhongMaterial({
		color: Colors.lightgreen,
		flatShading: true,
	});

	//create a mesh of the object
	this.mesh = new THREE.Mesh(geom, mat);
	//receive shadows
	this.mesh.receiveShadow = true;
}

Orbit = function(){

	var geom =new THREE.Object3D();

	this.mesh = geom;
	//this.mesh.add(sun);
}

Sun = function(){

	this.mesh = new THREE.Object3D();

	var sunGeom = new THREE.SphereGeometry( 400, 20, 10 );
	var sunMat = new THREE.MeshPhongMaterial({
		color: Colors.yellow,
		flatShading: true,
	});
	var sun = new THREE.Mesh(sunGeom, sunMat);
	sun.castShadow = false;
	sun.receiveShadow = false;
	this.mesh.add(sun);
}

Cloud = function(){
	// Create an empty container for the cloud
	this.mesh = new THREE.Object3D();
	// Cube geometry and material
	var geom = new THREE.DodecahedronGeometry(20,0);
	var mat = new THREE.MeshPhongMaterial({
		color:Colors.white,  
	});

	var nBlocs = 3+Math.floor(Math.random()*3);

	for (var i=0; i<nBlocs; i++ ){
		//Clone mesh geometry
		var m = new THREE.Mesh(geom, mat);
			//Randomly position each cube
			m.position.x = i*15;
			m.position.y = Math.random()*10;
			m.position.z = Math.random()*10;
			m.rotation.z = Math.random()*Math.PI*2;
			m.rotation.y = Math.random()*Math.PI*2;

			//Randomly scale the cubes
			var s = .1 + Math.random()*.9;
			m.scale.set(s,s,s);
			this.mesh.add(m);
	}
}

Sky = function(){

	this.mesh = new THREE.Object3D();

	// Number of cloud groups
	this.nClouds = 25;

	// Space the consistenly
	var stepAngle = Math.PI*2 / this.nClouds;

	// Create the Clouds

	for(var i=0; i<this.nClouds; i++){
	
		var c = new Cloud();

		//set rotation and position using trigonometry
		var a = stepAngle*i;
		// this is the distance between the center of the axis and the cloud itself
		var h = 800 + Math.random()*200;
		c.mesh.position.y = Math.sin(a)*h;
		c.mesh.position.x = Math.cos(a)*h;		

		// rotate the cloud according to its position
		c.mesh.rotation.z = a + Math.PI/2;

		// random depth for the clouds on the z-axis
		c.mesh.position.z = -400-Math.random()*400;

		// random scale for each cloud
		var s = 1+Math.random()*2;
		c.mesh.scale.set(s,s,s);

		this.mesh.add(c.mesh);
	}
}

// Load tree models from GLB file
function loadTreeModels() {
  if (!loader) {
    console.log('Loader not initialized, using fallback trees');
    modelsLoaded = true;
    return;
  }
  
  loader.load('assets/Walk in the Woods.glb', function(gltf) {
    // Extract all the tree models from the GLB file
    gltf.scene.traverse(function(child) {
      if (child.isMesh && child.name.toLowerCase().includes('tree')) {
        // Clone the tree model and store it
        var treeClone = child.clone();
        treeClone.castShadow = true;
        treeClone.receiveShadow = true;
        treeModels.push(treeClone);
      }
    });
    
    // If no specific tree objects found, use all meshes
    if (treeModels.length === 0) {
      gltf.scene.traverse(function(child) {
        if (child.isMesh) {
          var meshClone = child.clone();
          meshClone.castShadow = true;
          meshClone.receiveShadow = true;
          treeModels.push(meshClone);
        }
      });
    }
    
    modelsLoaded = true;
    console.log('Loaded ' + treeModels.length + ' tree models');
  }, undefined, function(error) {
    console.error('Error loading tree models:', error);
    // Fallback to basic geometric tree
    modelsLoaded = true;
  });
}

Tree = function () {
  this.mesh = new THREE.Object3D();
  
  if (modelsLoaded && treeModels.length > 0) {
    // Use a random tree model from the loaded GLB
    var randomIndex = Math.floor(Math.random() * treeModels.length);
    var treeModel = treeModels[randomIndex].clone();
    
    // Scale the tree appropriately
    var scale = 0.5 + Math.random() * 1.5; // Random scale between 0.5 and 2
    treeModel.scale.set(scale, scale, scale);
    
    this.mesh.add(treeModel);
  } else {
    // Fallback to basic geometric tree if models not loaded
    var matTreeLeaves = new THREE.MeshPhongMaterial( { color:Colors.green, flatShading: true});

    var geonTreeBase = new THREE.BoxGeometry( 10,20,10 );
    var matTreeBase = new THREE.MeshBasicMaterial( { color:Colors.brown});
    var treeBase = new THREE.Mesh(geonTreeBase,matTreeBase);
    treeBase.castShadow = true;
    treeBase.receiveShadow = true;
    this.mesh.add(treeBase);

    var geomTreeLeaves1 = new THREE.CylinderGeometry(1, 12*3, 12*3, 4 );
    var treeLeaves1 = new THREE.Mesh(geomTreeLeaves1,matTreeLeaves);
    treeLeaves1.castShadow = true;
    treeLeaves1.receiveShadow = true;
    treeLeaves1.position.y = 20
    this.mesh.add(treeLeaves1);

    var geomTreeLeaves2 = new THREE.CylinderGeometry( 1, 9*3, 9*3, 4 );
    var treeLeaves2 = new THREE.Mesh(geomTreeLeaves2,matTreeLeaves);
    treeLeaves2.castShadow = true;
    treeLeaves2.position.y = 40;
    treeLeaves2.receiveShadow = true;
    this.mesh.add(treeLeaves2);

    var geomTreeLeaves3 = new THREE.CylinderGeometry( 1, 6*3, 6*3, 4);
    var treeLeaves3 = new THREE.Mesh(geomTreeLeaves3,matTreeLeaves);
    treeLeaves3.castShadow = true;
    treeLeaves3.position.y = 55;
    treeLeaves3.receiveShadow = true;
    this.mesh.add(treeLeaves3);
  }
}

Flower = function () {

	this.mesh = new THREE.Object3D();

	var geomStem = new THREE.BoxGeometry( 5,50,5,1,1,1 );
	var matStem = new THREE.MeshPhongMaterial( { color:Colors.green, shading:THREE.FlatShading});
	var stem = new THREE.Mesh(geomStem,matStem);
	stem.castShadow = false;
	stem.receiveShadow = true;
	this.mesh.add(stem);


	var geomPetalCore = new THREE.BoxGeometry(10,10,10,1,1,1);
	var matPetalCore = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading});
	petalCore = new THREE.Mesh(geomPetalCore, matPetalCore);
	petalCore.castShadow = false;
	petalCore.receiveShadow = true;

	var petalColor = petalColors [Math.floor(Math.random()*3)];

	var geomPetal = new THREE.BoxGeometry( 15,20,5,1,1,1 );
	var matPetal = new THREE.MeshBasicMaterial( { color:petalColor});
	geomPetal.vertices[5].y-=4;
	geomPetal.vertices[4].y-=4;
	geomPetal.vertices[7].y+=4;
	geomPetal.vertices[6].y+=4;
	geomPetal.translate(12.5,0,3);

		var petals = [];
		for(var i=0; i<4; i++){	

			petals[i]=new THREE.Mesh(geomPetal,matPetal);
			petals[i].rotation.z = i*Math.PI/2;
			petals[i].castShadow = true;
			petals[i].receiveShadow = true;
		}

	petalCore.add(petals[0],petals[1],petals[2],petals[3]);
	petalCore.position.y = 25;
	petalCore.position.z = 3;
	this.mesh.add(petalCore);

}

var petalColors = [Colors.red, Colors.yellow, Colors.blue];



Forest = function(){

	this.mesh = new THREE.Object3D();

	// Number of Trees
	this.nTrees = 300;

	// Space the consistenly
	var stepAngle = Math.PI*2 / this.nTrees;

	// Create the Trees

	for(var i=0; i<this.nTrees; i++){
	
		var t = new Tree();

		//set rotation and position using trigonometry
		var a = stepAngle*i;
		// this is the distance between the center of the axis and the tree itself
		var h = 605;
		t.mesh.position.y = Math.sin(a)*h;
		t.mesh.position.x = Math.cos(a)*h;		

		// rotate the tree according to its position
		t.mesh.rotation.z = a + (Math.PI/2)*3;

		//Andreas Trigo funtime
		//t.mesh.rotation.z = Math.atan2(t.mesh.position.y, t.mesh.position.x)-Math.PI/2;

		// random depth for the tree on the z-axis
		t.mesh.position.z = 0-Math.random()*600;

		// random scale for each tree
		var s = .3+Math.random()*.75;
		t.mesh.scale.set(s,s,s);

		this.mesh.add(t.mesh);
	}

	// Number of Trees
	this.nFlowers = 350;

	var stepAngle = Math.PI*2 / this.nFlowers;


	for(var i=0; i<this.nFlowers; i++){	

		var f = new Flower();
		var a = stepAngle*i;

		var h = 605;
		f.mesh.position.y = Math.sin(a)*h;
		f.mesh.position.x = Math.cos(a)*h;		

		f.mesh.rotation.z = a + (Math.PI/2)*3;

		f.mesh.position.z = 0-Math.random()*600;

		var s = .1+Math.random()*.3;
		f.mesh.scale.set(s,s,s);

		this.mesh.add(f.mesh);
	}

}

var AirPlane = function() {
	
	this.mesh = new THREE.Object3D();

	// Create the cabin
	var geomCockpit = new THREE.BoxGeometry(80,50,50,1,1,1);
	var matCockpit = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	geomCockpit.vertices[4].y-=10;
	geomCockpit.vertices[4].z+=20;
	geomCockpit.vertices[5].y-=10;
	geomCockpit.vertices[5].z-=20;
	geomCockpit.vertices[6].y+=30;
	geomCockpit.vertices[6].z+=20;
	geomCockpit.vertices[7].y+=30;
	geomCockpit.vertices[7].z-=20;
	var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
	cockpit.castShadow = true;
	cockpit.receiveShadow = true;
	this.mesh.add(cockpit);
	
	// Create the engine
	var geomEngine = new THREE.BoxGeometry(20,50,50,1,1,1);
	var matEngine = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var engine = new THREE.Mesh(geomEngine, matEngine);
	engine.position.x = 40;
	engine.castShadow = true;
	engine.receiveShadow = true;
	this.mesh.add(engine);
	
	// Create the tail
	var geomTailPlane = new THREE.BoxGeometry(15,20,5,1,1,1);
	var matTailPlane = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
	tailPlane.position.set(-35,25,0);
	tailPlane.castShadow = true;
	tailPlane.receiveShadow = true;
	this.mesh.add(tailPlane);
	
	// Create the wing
	var geomSideWing = new THREE.BoxGeometry(40,4,150,1,1,1);
	var matSideWing = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

	var sideWingTop = new THREE.Mesh(geomSideWing, matSideWing);
	var sideWingBottom = new THREE.Mesh(geomSideWing, matSideWing);
	sideWingTop.castShadow = true;
	sideWingTop.receiveShadow = true;
	sideWingBottom.castShadow = true;
	sideWingBottom.receiveShadow = true;

	sideWingTop.position.set(20,12,0);
	sideWingBottom.position.set(20,-3,0);
	this.mesh.add(sideWingTop);
	this.mesh.add(sideWingBottom);

	var geomWindshield = new THREE.BoxGeometry(3,15,20,1,1,1);
	var matWindshield = new THREE.MeshPhongMaterial({color:Colors.white,transparent:true, opacity:.3, shading:THREE.FlatShading});;
	var windshield = new THREE.Mesh(geomWindshield, matWindshield);
	windshield.position.set(5,27,0);

	windshield.castShadow = true;
	windshield.receiveShadow = true;

	this.mesh.add(windshield);

	var geomPropeller = new THREE.BoxGeometry(20,10,10,1,1,1);
	geomPropeller.vertices[4].y-=5;
	geomPropeller.vertices[4].z+=5;
	geomPropeller.vertices[5].y-=5;
	geomPropeller.vertices[5].z-=5;
	geomPropeller.vertices[6].y+=5;
	geomPropeller.vertices[6].z+=5;
	geomPropeller.vertices[7].y+=5;
	geomPropeller.vertices[7].z-=5;
	var matPropeller = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
	this.propeller.castShadow = true;
	this.propeller.receiveShadow = true;


	var geomBlade1 = new THREE.BoxGeometry(1,100,10,1,1,1);
	var geomBlade2 = new THREE.BoxGeometry(1,10,100,1,1,1);
	var matBlade = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	
	var blade1 = new THREE.Mesh(geomBlade1, matBlade);
	blade1.position.set(8,0,0);
	blade1.castShadow = true;
	blade1.receiveShadow = true;

	var blade2 = new THREE.Mesh(geomBlade2, matBlade);
	blade2.position.set(8,0,0);
	blade2.castShadow = true;
	blade2.receiveShadow = true;
	this.propeller.add(blade1, blade2);
	this.propeller.position.set(50,0,0);
	this.mesh.add(this.propeller);

	var wheelProtecGeom = new THREE.BoxGeometry(30,15,10,1,1,1);
	var wheelProtecMat = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var wheelProtecR = new THREE.Mesh(wheelProtecGeom,wheelProtecMat);
	wheelProtecR.position.set(25,-20,25);
	this.mesh.add(wheelProtecR);

	var wheelTireGeom = new THREE.BoxGeometry(24,24,4);
	var wheelTireMat = new THREE.MeshPhongMaterial({color:Colors.brownDark, shading:THREE.FlatShading});
	var wheelTireR = new THREE.Mesh(wheelTireGeom,wheelTireMat);
	wheelTireR.position.set(25,-28,25);

	var wheelAxisGeom = new THREE.BoxGeometry(10,10,6);
	var wheelAxisMat = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	var wheelAxis = new THREE.Mesh(wheelAxisGeom,wheelAxisMat);
	wheelTireR.add(wheelAxis);

	this.mesh.add(wheelTireR);

	var wheelProtecL = wheelProtecR.clone();
	wheelProtecL.position.z = -wheelProtecR.position.z ;
	this.mesh.add(wheelProtecL);

	var wheelTireL = wheelTireR.clone();
	wheelTireL.position.z = -wheelTireR.position.z;
	this.mesh.add(wheelTireL);

	var wheelTireB = wheelTireR.clone();
	wheelTireB.scale.set(.5,.5,.5);
	wheelTireB.position.set(-35,-5,0);
	this.mesh.add(wheelTireB);

	var suspensionGeom = new THREE.BoxGeometry(4,20,4);
	suspensionGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0,10,0))
	var suspensionMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});
	var suspension = new THREE.Mesh(suspensionGeom,suspensionMat);
	suspension.position.set(-35,-5,0);
	suspension.rotation.z = -.3;
	this.mesh.add(suspension);
};

var Fox = function() {
	
	this.mesh = new THREE.Object3D();
	
	var redFurMat = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading});

	// Create the Body
	var geomBody = new THREE.BoxGeometry(100,50,50,1,1,1);
	var body = new THREE.Mesh(geomBody, redFurMat);
	body.castShadow = true;
	body.receiveShadow = true;
	this.mesh.add(body);
	
	// Create the Chest
	var geomChest = new THREE.BoxGeometry(50,60,70,1,1,1);
	var chest = new THREE.Mesh(geomChest, redFurMat);
	chest.position.x = 60;
	chest.castShadow = true;
	chest.receiveShadow = true;
	this.mesh.add(chest);

	// Create the Head
	var geomHead = new THREE.BoxGeometry(40,55,50,1,1,1);
	this.head = new THREE.Mesh(geomHead, redFurMat);
	this.head.position.set(80, 35, 0);
	this.head.castShadow = true;
	this.head.receiveShadow = true;

	// Create the Snout
	var geomSnout = new THREE.BoxGeometry(40,30,30,1,1,1);
	var snout = new THREE.Mesh(geomSnout, redFurMat);
	geomSnout.vertices[0].y-=5;
	geomSnout.vertices[0].z+=5;
	geomSnout.vertices[1].y-=5;
	geomSnout.vertices[1].z-=5;
	geomSnout.vertices[2].y+=5;
	geomSnout.vertices[2].z+=5;
	geomSnout.vertices[3].y+=5;
	geomSnout.vertices[3].z-=5;
	snout.castShadow = true;
	snout.receiveShadow = true;
	snout.position.set(30,0,0);
	this.head.add(snout);

	// Create the Nose
	var geomNose = new THREE.BoxGeometry(10,15,20,1,1,1);
	var matNose = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
	var nose = new THREE.Mesh(geomNose, matNose);
	nose.position.set(55,0,0);
	this.head.add(nose);

	// Create the Ears
	var geomEar = new THREE.BoxGeometry(10,40,30,1,1,1);
	var earL = new THREE.Mesh(geomEar, redFurMat);
	earL.position.set(-10,40,-18);
	this.head.add(earL);
	earL.rotation.x=-Math.PI/10;
	geomEar.vertices[1].z+=5;
	geomEar.vertices[4].z+=5;
	geomEar.vertices[0].z-=5;
	geomEar.vertices[5].z-=5;

	// Create the Ear Tips
	var geomEarTipL = new THREE.BoxGeometry(10,10,20,1,1,1);
	var matEarTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var earTipL = new THREE.Mesh(geomEarTipL, matEarTip);
	earTipL.position.set(0,25,0);
	earL.add(earTipL);

	var earR = earL.clone();
	earR.position.z = -earL.position.z;
	earR.rotation.x = -	earL.rotation.x;
	this.head.add(earR);

	this.mesh.add(this.head);

	
	// Create the tail
	var geomTail = new THREE.BoxGeometry(80,40,40,2,1,1);
	geomTail.vertices[4].y-=10;
	geomTail.vertices[4].z+=10;
	geomTail.vertices[5].y-=10;
	geomTail.vertices[5].z-=10;
	geomTail.vertices[6].y+=10;
	geomTail.vertices[6].z+=10;
	geomTail.vertices[7].y+=10;
	geomTail.vertices[7].z-=10;
	this.tail = new THREE.Mesh(geomTail, redFurMat);
	this.tail.castShadow = true;
	this.tail.receiveShadow = true;

	// Create the tail Tip
	var geomTailTip = new THREE.BoxGeometry(20,40,40,1,1,1);
	var matTailTip = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var tailTip = new THREE.Mesh(geomTailTip, matTailTip);
	tailTip.position.set(80,0,0);
	tailTip.castShadow = true;
	tailTip.receiveShadow = true;
	this.tail.add(tailTip);
	this.tail.position.set(-40,10,0);
	geomTail.translate(40,0,0);
	geomTailTip.translate(10,0,0);
	this.tail.rotation.z = Math.PI/1.5;
	this.mesh.add(this.tail);

	// Create the Legs
	var geomLeg = new THREE.BoxGeometry(20,60,20,1,1,1);
	this.legFR = new THREE.Mesh(geomLeg, redFurMat);
	this.legFR.castShadow = true;
	this.legFR.receiveShadow = true;

	// Create the feet
	var geomFeet = new THREE.BoxGeometry(20,20,20,1,1,1);
	var matFeet = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
	var feet = new THREE.Mesh(geomFeet, matFeet);
	feet.position.set(0,0,0);
	feet.castShadow = true;
	feet.receiveShadow = true;
	this.legFR.add(feet);
	this.legFR.position.set(70,-12,25);
	geomLeg.translate(0,40,0);
	geomFeet.translate(0,80,0);
	this.legFR.rotation.z = 16;
	this.mesh.add(this.legFR);

	this.legFL = this.legFR.clone();
	this.legFL.position.z = -this.legFR.position.z;
	this.legFL.rotation.z = -this.legFR.rotation.z;
	this.mesh.add(this.legFL);

	this.legBR = this.legFR.clone();
	this.legBR.position.x = -(this.legFR.position.x)+50;
	this.legBR.rotation.z = -this.legFR.rotation.z;
	this.mesh.add(this.legBR);

	this.legBL = this.legFL.clone();
	this.legBL.position.x = -(this.legFL.position.x)+50;
	this.legBL.rotation.z = -this.legFL.rotation.z;
	this.mesh.add(this.legBL);

};

// New obstacle constructors
Bird = function(){
  this.mesh = new THREE.Object3D();
  
  // Bird body
  var bodyGeom = new THREE.SphereGeometry(8, 6, 6);
  var bodyMat = new THREE.MeshPhongMaterial({color: Colors.brown, flatShading: true});
  var body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  this.mesh.add(body);
  
  // Wings
  var wingGeom = new THREE.BoxGeometry(3, 1, 12);
  var wingMat = new THREE.MeshPhongMaterial({color: Colors.brownDark, flatShading: true});
  var wingL = new THREE.Mesh(wingGeom, wingMat);
  var wingR = new THREE.Mesh(wingGeom, wingMat);
  wingL.position.set(0, 2, -8);
  wingR.position.set(0, 2, 8);
  wingL.castShadow = true;
  wingR.castShadow = true;
  this.mesh.add(wingL);
  this.mesh.add(wingR);
  
  // Animate wings
  this.wingL = wingL;
  this.wingR = wingR;
  this.wingSpeed = 0;
};

Bridge = function(){
  this.mesh = new THREE.Object3D();
  
  // Bridge pillars
  var pillarGeom = new THREE.BoxGeometry(20, 150, 20);
  var pillarMat = new THREE.MeshPhongMaterial({color: Colors.brown, flatShading: true});
  var pillar1 = new THREE.Mesh(pillarGeom, pillarMat);
  var pillar2 = new THREE.Mesh(pillarGeom, pillarMat);
  pillar1.position.set(0, 75, -100);
  pillar2.position.set(0, 75, 100);
  pillar1.castShadow = true;
  pillar2.castShadow = true;
  this.mesh.add(pillar1);
  this.mesh.add(pillar2);
  
  // Bridge deck
  var deckGeom = new THREE.BoxGeometry(30, 10, 220);
  var deckMat = new THREE.MeshPhongMaterial({color: Colors.brownDark, flatShading: true});
  var deck = new THREE.Mesh(deckGeom, deckMat);
  deck.position.set(0, 150, 0);
  deck.castShadow = true;
  this.mesh.add(deck);
};

Cave = function(){
  this.mesh = new THREE.Object3D();
  
  // Cave opening (hollow cylinder)
  var caveGeom = new THREE.RingGeometry(30, 80, 8);
  var caveMat = new THREE.MeshPhongMaterial({color: Colors.brown, flatShading: true});
  var cave = new THREE.Mesh(caveGeom, caveMat);
  cave.castShadow = true;
  this.mesh.add(cave);
  
  // Cave walls
  var wallGeom = new THREE.CylinderGeometry(80, 80, 20, 8);
  var wall = new THREE.Mesh(wallGeom, caveMat);
  wall.rotation.x = Math.PI/2;
  wall.castShadow = true;
  this.mesh.add(wall);
};

Barn = function(){
  this.mesh = new THREE.Object3D();
  
  // Barn base
  var baseGeom = new THREE.BoxGeometry(60, 40, 40);
  var baseMat = new THREE.MeshPhongMaterial({color: Colors.red, flatShading: true});
  var base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 20;
  base.castShadow = true;
  this.mesh.add(base);
  
  // Barn roof
  var roofGeom = new THREE.ConeGeometry(35, 30, 4);
  var roofMat = new THREE.MeshPhongMaterial({color: Colors.brownDark, flatShading: true});
  var roof = new THREE.Mesh(roofGeom, roofMat);
  roof.position.y = 55;
  roof.rotation.y = Math.PI/4;
  roof.castShadow = true;
  this.mesh.add(roof);
};

Flower = function(){
  this.mesh = new THREE.Object3D();
  
  // Stem
  var stemGeom = new THREE.CylinderGeometry(1, 1, 20);
  var stemMat = new THREE.MeshPhongMaterial({color: Colors.green, flatShading: true});
  var stem = new THREE.Mesh(stemGeom, stemMat);
  stem.position.y = 10;
  this.mesh.add(stem);
  
  // Flower petals
  var petalGeom = new THREE.SphereGeometry(3, 6, 6);
  var petalMat = new THREE.MeshPhongMaterial({color: Colors.pink, flatShading: true});
  for(var i = 0; i < 5; i++){
    var petal = new THREE.Mesh(petalGeom, petalMat);
    var angle = (i/5) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 5, 20, Math.sin(angle) * 5);
    this.mesh.add(petal);
  }
  
  // Center
  var centerGeom = new THREE.SphereGeometry(2, 6, 6);
  var centerMat = new THREE.MeshPhongMaterial({color: Colors.yellow, flatShading: true});
  var center = new THREE.Mesh(centerGeom, centerMat);
  center.position.y = 20;
  this.mesh.add(center);
};

var sky;
var forest;
var land;
var orbit;
var airplane;
var sun;
var fox;

var mousePos={x:0, y:0};
var offSet = -600;

// Game state
var gameState = {
  score: 0,
  obstacles: [],
  lastObstacleSpawn: 0,
  obstacleSpawnInterval: 1500, // 1.5 seconds - spawn more frequently
  gameSpeed: 2,
  groundTiles: [],
  lastGroundSpawn: 0,
  cloudTiles: [],
  lastCloudSpawn: 0,
  airplaneZ: -250 // Airplane's Z position for collision alignment
};


function createSky(){
  // Create initial cloud tiles instead of circular sky
  for(var i = 0; i < 3; i++){
    spawnCloudTile(i * 1000);
  }
}

function createLand(){
  // Create initial ground tiles
  for(var i = 0; i < 5; i++){
    var groundTile = new Land();
    groundTile.mesh.position.set(i * 2000 - 2000, -50, 0);
    scene.add(groundTile.mesh);
    gameState.groundTiles.push(groundTile.mesh);
  }
}

function createOrbit(){
  orbit = new Orbit();
  orbit.mesh.position.y = offSet;
  orbit.mesh.rotation.z = -Math.PI/6; 
  scene.add(orbit.mesh);
}

function createForest(){
  // Don't create the circular forest anymore
  // Trees will be spawned as individual obstacles
}

function createSun(){ 
	sun = new Sun();
	sun.mesh.scale.set(1,1,.3);
	sun.mesh.position.set(0,-30,-850);
	scene.add(sun.mesh);
}


function createPlane(){ 
	airplane = new AirPlane();
	airplane.mesh.scale.set(.35,.35,.35);
	airplane.mesh.position.set(-40,110,-250);
	// airplane.mesh.rotation.z = Math.PI/15;
	scene.add(airplane.mesh);
}

function createFox(){ 
	fox = new Fox();
	fox.mesh.scale.set(.35,.35,.35);
	fox.mesh.position.set(-40,110,-250);
	scene.add(fox.mesh);
}


function updatePlane() {

	var targetY = normalize(mousePos.y,-.75,.75, 50, 190);
	var targetX = normalize(mousePos.x,-.75,.75,-100, -20);
	
	// Move the plane at each frame by adding a fraction of the remaining distance
	airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;

	// Keep the original forward/backward movement
	airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*0.1;

	// Rotate the plane proportionally to the remaining distance
	airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*0.0128;
	airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*0.0064;
	airplane.mesh.rotation.y = (airplane.mesh.position.x-targetX)*0.0064;

	airplane.propeller.rotation.x += 0.3;
}

function normalize(v,vmin,vmax,tmin, tmax){

	var nv = Math.max(Math.min(v,vmax), vmin);
	var dv = vmax-vmin;
	var pc = (nv-vmin)/dv;
	var dt = tmax-tmin;
	var tv = tmin + (pc*dt);
	return tv;

}


function spawnObstacle(){
  var obstacleTypes = ['bird', 'bridge', 'cave', 'barn', 'flower', 'tree', 'cloud'];
  var randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
  var obstacle;
  var groundLevel = -50; // Same as land position
  
  switch(randomType){
    case 'bird':
      obstacle = new Bird();
      // Birds fly at airplane's Z level with slight variation
      obstacle.mesh.position.set(500, 50 + Math.random() * 200, gameState.airplaneZ + (Math.random() * 100 - 50));
      break;
    case 'bridge':
      obstacle = new Bridge();
      obstacle.mesh.position.set(500, groundLevel, gameState.airplaneZ);
      break;
    case 'cave':
      obstacle = new Cave();
      obstacle.mesh.position.set(500, 100 + Math.random() * 100, gameState.airplaneZ);
      break;
    case 'barn':
      obstacle = new Barn();
      obstacle.mesh.position.set(500, groundLevel, gameState.airplaneZ + (Math.random() * 100 - 50));
      break;
    case 'flower':
      obstacle = new Flower();
      obstacle.mesh.position.set(500, groundLevel, gameState.airplaneZ + (Math.random() * 100 - 50));
      break;
    case 'tree':
      obstacle = new Tree();
      obstacle.mesh.position.set(500, groundLevel, gameState.airplaneZ + (Math.random() * 100 - 50));
      break;
    case 'cloud':
      obstacle = new Cloud();
      obstacle.mesh.position.set(500, 150 + Math.random() * 100, gameState.airplaneZ + (Math.random() * 100 - 50));
      break;
  }
  
  scene.add(obstacle.mesh);
  gameState.obstacles.push({mesh: obstacle.mesh, type: randomType, object: obstacle});
}

function spawnCloudTile(xPosition){
  // Create a group of clouds at different heights
  for(var i = 0; i < 8; i++){
    var cloud = new Cloud();
    cloud.mesh.position.set(
      xPosition + (Math.random() * 800 - 400), 
      200 + Math.random() * 200, 
      gameState.airplaneZ + (Math.random() * 400 - 200)
    );
    var scale = 0.5 + Math.random() * 1.5;
    cloud.mesh.scale.set(scale, scale, scale);
    scene.add(cloud.mesh);
    gameState.cloudTiles.push(cloud.mesh);
  }
}

function updateClouds(){
  // Move cloud tiles left
  for(var i = gameState.cloudTiles.length - 1; i >= 0; i--){
    var cloud = gameState.cloudTiles[i];
    cloud.position.x -= gameState.gameSpeed * 0.5; // Clouds move slower
    
    // Remove clouds that are way off screen
    if(cloud.position.x < -2000){
      scene.remove(cloud);
      gameState.cloudTiles.splice(i, 1);
    }
  }
  
  // Add new cloud tiles when needed
  if(gameState.cloudTiles.length < 20){ // Keep at least 20 clouds
    var furthestX = -1000;
    for(var j = 0; j < gameState.cloudTiles.length; j++){
      if(gameState.cloudTiles[j].position.x > furthestX){
        furthestX = gameState.cloudTiles[j].position.x;
      }
    }
    spawnCloudTile(furthestX + 1000);
  }
}

function updateObstacles(){
  // Move obstacles left
  for(var i = gameState.obstacles.length - 1; i >= 0; i--){
    var obstacle = gameState.obstacles[i];
    obstacle.mesh.position.x -= gameState.gameSpeed;
    
    // Animate birds
    if(obstacle.type === 'bird'){
      obstacle.object.wingSpeed += 0.3;
      obstacle.object.wingL.rotation.z = Math.sin(obstacle.object.wingSpeed) * 0.5;
      obstacle.object.wingR.rotation.z = -Math.sin(obstacle.object.wingSpeed) * 0.5;
    }
    
    // Remove obstacles that are off screen
    if(obstacle.mesh.position.x < -500){
      scene.remove(obstacle.mesh);
      gameState.obstacles.splice(i, 1);
    }
  }
}

function updateGround(){
  // Move ground tiles left
  for(var i = gameState.groundTiles.length - 1; i >= 0; i--){
    var tile = gameState.groundTiles[i];
    tile.position.x -= gameState.gameSpeed;
    
    // Remove tiles that are way off screen
    if(tile.position.x < -3000){
      scene.remove(tile);
      gameState.groundTiles.splice(i, 1);
    }
  }
  
  // Add new ground tiles when needed
  if(gameState.groundTiles.length > 0){
    var lastTile = gameState.groundTiles[gameState.groundTiles.length - 1];
    if(lastTile.position.x < 2000){
      var newTile = new Land();
      newTile.mesh.position.set(lastTile.position.x + 2000, -50, 0);
      scene.add(newTile.mesh);
      gameState.groundTiles.push(newTile.mesh);
    }
  }
}

function updateScore(){
  gameState.score += 0.0167; // Roughly 1 point per second at 60fps
  document.getElementById('score').textContent = 'Score: ' + Math.floor(gameState.score);
}

function createUI(){
  var scoreDiv = document.createElement('div');
  scoreDiv.id = 'score';
  scoreDiv.style.position = 'absolute';
  scoreDiv.style.top = '20px';
  scoreDiv.style.left = '20px';
  scoreDiv.style.color = 'white';
  scoreDiv.style.fontSize = '24px';
  scoreDiv.style.fontFamily = 'Arial';
  scoreDiv.style.zIndex = '100';
  scoreDiv.textContent = 'Score: 0';
  document.body.appendChild(scoreDiv);
}

function loop(){
  // Move world from right to left (like Flappy Bird)
  orbit.mesh.position.x -= gameState.gameSpeed;
  
  // Reset positions when they go too far left
  if(orbit.mesh.position.x < -2000) orbit.mesh.position.x = 0;
  
  // Spawn obstacles more frequently
  if(Date.now() - gameState.lastObstacleSpawn > gameState.obstacleSpawnInterval){
    spawnObstacle();
    gameState.lastObstacleSpawn = Date.now();
  }
  
  updateGround();
  updateClouds();
  updateObstacles();
  updateScore();
  updatePlane();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function handleMouseMove (event) {
	var tx = -1 + (event.clientX / WIDTH)*2;
	var ty = 1 - (event.clientY / HEIGHT)*2;
	mousePos = {x:tx, y:ty};	
}


function init(event) {
	createScene();
	createLights();
	initLoader(); // Initialize the GLTF loader
	loadTreeModels(); // Load the 3D tree models
	createPlane();
	createOrbit();
	createSun();
	createLand();
	createForest();
	createSky();
	createUI();
	//createFox();

	document.addEventListener('mousemove', handleMouseMove, false);

	loop();
}

window.addEventListener('load', init, false);
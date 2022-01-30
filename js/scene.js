//graphic
let camera, scene, renderer, controls, clock, keyboard,
    geometry, material, sphere,
    ambientLight, spotlight, lightTarget;
let mouse = { x: 0, y: 0 };

//objects
let gltfLoader, plane, ball, goal, wall, shootBallObj;
let goalkeeper, goalkeeperBody, goalkeeperHands;
let planeName = 'plane', goalkeeperName = 'goalkeeper', ballName = 'ball',
    goalName = 'goal', shootBallName = 'shootBall', wallName = 'wall';

//sounds
let shootSound, goalSound, audioListener;

//moving goalkeeper
var curve, points, curveGeometry, curveMaterial, curveObject, PosIndex = 0;

//moving ball
let moveDirection = { left: 0, right: 0, forward: 0, back: 0 };
const STATE = { DISABLE_DEACTIVATION : 4 };
const FLAGS = { CF_KINEMATIC_OBJECT: 2 };
let ammoTmpPos = null, ammoTmpQuat = null;

//physic
let physicsWorld, tmpTrans, rigidBodies = [ ];
let gravityConst = -0.5;
let margin = 0.05;
let mass = 1;

Ammo().then( init );

function init() {
    tmpTrans = new Ammo.btTransform();
    gltfLoader = new THREE.GLTFLoader();
    ammoTmpPos = new Ammo.btVector3();
    ammoTmpQuat = new Ammo.btQuaternion();

    setupGraphics();
    setupPhysicsWorld();

    addPlane();
    addSphere();
    addObjects();

    setupEventHandlers();
    render();
}
function render() {
    let deltaTime = clock.getDelta();

    if( ball != null ) {
        moveBall();
    }

    updatePhysics( deltaTime );
    update();

    if( shootBallObj!= null && shootBallObj.position.y < -1 ){
        scene.remove( shootBallObj );
        shootBallObj = null;
    }

    renderer.render( scene, camera );
    requestAnimationFrame( render );

    // if(goalkeeper != null){
    //     PosIndex+=5;
    //     if (PosIndex > 10000) { PosIndex = 0;}
    //     var newPos = curve.getPoint(PosIndex / 1000);
    //     moveGoalkeeper(newPos);
    // }
}
function update() {
    controls.update();
}

function onDocumentMouseMove( event ) {
    mouse.x =   ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function setupGraphics(){
    clock = new THREE.Clock();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth/window.innerHeight, 0.01, 1000 );
    camera.position.set( 0, 1, 2.75 );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth*0.8, window.innerHeight*0.8 );
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    document.getElementById( 'navigation' ).appendChild( renderer.domElement );

    audioListener = new THREE.AudioListener();
    camera.add(audioListener);
    loadGoalSound();
    loadShootSound();

    setupCurveForMoveGoalkeeper();

    addLight();

    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enabled = false;

    keyboard = new THREEx.KeyboardState();

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}
function setupPhysicsWorld(){
    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher( collisionConfiguration ),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld( dispatcher, overlappingPairCache,
        solver, collisionConfiguration );
    physicsWorld.setGravity( new Ammo.btVector3(0, gravityConst, 0) );
}
function updatePhysics( deltaTime ){
    physicsWorld.stepSimulation( deltaTime, 10 );

    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {
            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
        }
    }

    //detectCollision();
}

function addLight() {
    ambientLight = new THREE.AmbientLight( 0xffffff );
    scene.add( ambientLight );

    spotlight = new THREE.SpotLight( 0xffffff );
    spotlight.position.set( 0 , 4 , 5 );
    spotlight.angle = Math.PI/4;
    spotlight.intensity = 1;
    spotlight.castShadow = true;
    scene.add( spotlight );

    lightTarget = new THREE.Object3D();
    lightTarget.position.set( 0, 0.1, 2 );
    scene.add( lightTarget );
    spotlight.target = lightTarget;
}
function addPlane() {
    let grassTexture = new THREE.TextureLoader().load( '../texture/grass.jpg' );
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set( 5, 5 );
    let materialPlane = new THREE.MeshPhongMaterial( {
        map: grassTexture,
        side: THREE.DoubleSide
    } );
    materialPlane.receiveShadow = true;

    plane = new THREE.Mesh( new THREE.BoxGeometry( 20, 30, 0.01 ), materialPlane );
    plane.name = planeName;
    plane.position.set( 0, 0, 0 );
    plane.rotation.x -= Math.PI/2;
    plane.castShadow = true;
    plane.receiveShadow = true;
    scene.add( plane );

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( 0, 0, 0 ) );
    transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( 10, 0.01, 30 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( 0, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( 0, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    physicsWorld.addRigidBody( body );
}
function addSphere(){
    let geometrySphere = new THREE.SphereGeometry( 100, 100, 100 );
    let sphereTexture = new new THREE.TextureLoader().load( '../texture/sky.jpg' );
    let materialSphere = new THREE.MeshBasicMaterial( { map: sphereTexture, transparent: true, side: THREE.DoubleSide } );
    sphere = new THREE.Mesh( geometrySphere, materialSphere );
    sphere.position.set( 0, 0, 0 );
    scene.add( sphere );
}

function addObjects(){
    addWall();
    addGoal();
    addGoalkeeper();
    addBall();
}
function addWall(){
    let pos = { x: 0, y: 0, z: -6 };
    let scale = { x: 20, y: 5, z: 0.125 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0;

    //threeJS Section
    let wallTexture = new THREE.TextureLoader().load( '../texture/wall.jpg' );
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set( 1, 1 );
    let materialPlane = new THREE.MeshPhongMaterial( {
        map: wallTexture,
        side: THREE.DoubleSide
    } );
    materialPlane.receiveShadow = true;
    wall = new THREE.Mesh( new THREE.BoxBufferGeometry(), materialPlane );
    wall.position.set( pos.x, pos.y, pos.z );
    wall.scale.set( scale.x, scale.y, scale.z );
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.name = wallName;

    scene.add( wall );

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    wall.userData.physicsBody = body;
}

function addGoal(){
    let objectPath = '../models/football-goal.gltf';
    let pos = { x: 1.9, y:0, z:-4 };
    let scale = 0.008;

    gltfLoader.load( objectPath, function ( gltf ) {
        goal = gltf.scene;
        goal.position.set( pos.x, pos.y, pos.z );
        goal.rotation.y = Math.PI;
        goal.scale.set( scale, scale, scale );
        goal.name = goalName;

        goal.traverse( child => {
            if( child.isMesh ){
                child.castShadow = true;
            }
        } );
        scene.add( goal );
    } );

    addLeftGoalWall();
    addRightGoalWall();
    addBackGoalWall();
    addUpGoalWall();
}
function addLeftGoalWall(){
    let pos = {x: -2.1, y: 0, z: -3.95};
    let scale = {x: 0.05, y: 3.2, z: 1};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let leftWall = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
    leftWall.position.set(pos.x, pos.y, pos.z);
    leftWall.scale.set(scale.x, scale.y, scale.z);
    leftWall.visible = false;
    scene.add(leftWall);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x*0.5, scale.y*0.5, scale.z ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    leftWall.userData.physicsBody = body;
}
function addRightGoalWall(){
    let pos = {x: 1.9, y: 0, z: -3.95};
    let scale = {x: 0.05, y: 3.2, z: 1};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let rightWall = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
    rightWall.position.set(pos.x, pos.y, pos.z);
    rightWall.scale.set(scale.x, scale.y, scale.z);
    rightWall.visible = false;
    scene.add(rightWall);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x*0.5, scale.y*0.5, scale.z ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    rightWall.userData.physicsBody = body;
}
function addUpGoalWall(){
    let pos = {x: -0.1, y: 1.6, z: -3.90};
    let scale = {x: 0.05, y: 3.9, z: 1};
    let quat = {x: 0, y: 0, z: Math.PI/2, w: 1};
    let mass = 0;

    //threeJS Section
    let upWall = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));
    upWall.position.set(pos.x, pos.y, pos.z);
    upWall.scale.set(scale.x, scale.y, scale.z);
    upWall.rotation.z = Math.PI/2;
    upWall.visible = false;
    scene.add(upWall);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    upWall.userData.physicsBody = body;
}
function addBackGoalWall(){
    let pos = {x: -0.1, y: 0.7, z: -4.3};
    let scale = {x: 4, y: 2, z: 0.05};
    let quat = {x: Math.PI/8, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let backWall = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xff00ff}));
    backWall.position.set(pos.x, pos.y, pos.z);
    backWall.scale.set(scale.x, scale.y, scale.z);
    backWall.rotation.x = Math.PI/8;
    backWall.visible = false;
    scene.add(backWall);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    backWall.userData.physicsBody = body;
}

function addBall() {
    let objectPath = '../models/football-ball.gltf';
    let pos = {x: 0, y: 0.1, z:2};
    let scale = 0.15;

    gltfLoader.load(objectPath, function (gltf) {
        ball = gltf.scene;
        ball.position.set(pos.x,pos.y,pos.z);
        ball.scale.set(scale,scale,scale);
        ball.name = ballName;

        ball.traverse(child => {
            if(child.isMesh){
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(ball);

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( ball.position.x, ball.position.y, ball.position.z ) );
        transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
        let motionState = new Ammo.btDefaultMotionState( transform );
        let colShape = new Ammo.btSphereShape( 0.1 );
        colShape.setMargin( margin );
        let localInertia = new Ammo.btVector3( 0, 0, 0 );
        colShape.calculateLocalInertia( mass, localInertia );
        let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
        let body = new Ammo.btRigidBody( rbInfo );
        //body.setActivationState( STATE.DISABLE_DEACTIVATION );

        physicsWorld.addRigidBody( body );
        ball.userData.physicsBody = body;
        rigidBodies.push( ball );
    });
}
function shootBall( curveNum ){
    scene.remove( ball );
    ball = null;

    let node1 = new Ammo.btVector3( -1.8, 2.5, -6 );
    let node2 = new Ammo.btVector3( -1.8, 0.5, -6 );
    let node3 = new Ammo.btVector3( 0, 2.5, -4.6 );
    let node4 = new Ammo.btVector3( 0, 0., -4.9 );
    let node5 = new Ammo.btVector3( 1.8, 2.5, -6 );
    let node6 = new Ammo.btVector3( 1.8, 0., -6 );

    if( shootBallObj == null ){
        switch( curveNum ){
            case 1:
                createShootBall( node1 );
                break;
            case 2:
                createShootBall( node2 );
                break;
            case 3:
                createShootBall( node3 );
                break;
            case 4:
                createShootBall( node4 );
                break;
            case 5:
                createShootBall( node5 );
                break;
            case 6:
                createShootBall( node6 );
                break;
        }
    }
}
function createShootBall( shootVector ){
    let objectPath = '../models/football-ball.gltf';
    let pos = {x: 0, y: 0, z:2};
    let scale = 0.15;

    if( shootBallObj == null ){
        gltfLoader.load(objectPath, function ( gltf ) {
            shootBallObj = gltf.scene;
            shootBallObj.position.set( pos.x, pos.y, pos.z );
            shootBallObj.scale.set( scale, scale, scale );
            shootBallObj.name = shootBallName;

            shootBallObj.traverse(child => {
                if(child.isMesh){
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            } );

            scene.add( shootBallObj );

            //Ammojs Section
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3( shootBallObj.position.x, shootBallObj.position.y, shootBallObj.position.z ) );
            transform.setRotation( new Ammo.btQuaternion( 0, 0, 0, 1 ) );
            let motionState = new Ammo.btDefaultMotionState( transform );
            let colShape = new Ammo.btSphereShape( 0.1 );
            colShape.setMargin( margin );
            let localInertia = new Ammo.btVector3( 0, 0, 0 );
            colShape.calculateLocalInertia( mass, localInertia );
            let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
            let body = new Ammo.btRigidBody( rbInfo );
            body.setActivationState( STATE.DISABLE_DEACTIVATION );

            physicsWorld.addRigidBody( body );

            shootSound.play();
            body.setLinearVelocity( shootVector );

            shootBallObj.userData.physicsBody = body;
            rigidBodies.push(shootBallObj);
        });
    }
}

function addGoalkeeper(){
    let objectPath = '../models/football-goalkeeper.gltf';
    let pos = { x: 0, y:0.01, z:-3.25 };
    let scale = 0.65;

    gltfLoader.load( objectPath, function ( gltf ) {
        goalkeeper = gltf.scene;
        goalkeeper.position.set( pos.x, pos.y, pos.z );
        goalkeeper.scale.set( scale, scale, scale );
        goalkeeper.name = goalkeeperName;

        goalkeeper.traverse( child => {
            if( child.isMesh ){
                child.castShadow = true;
            }
        } );

        scene.add( goalkeeper );
    } );

    addGoalkeeperBody();
    addGoalkeeperHands();
}
function addGoalkeeperBody(){
    let pos = {x: 0, y: 0, z: -3.25};
    let scale = {x: 0.25, y: 2.35, z: 0.2};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    goalkeeperBody = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0x00ffff}));
    goalkeeperBody.position.set(pos.x, pos.y, pos.z);
    goalkeeperBody.scale.set(scale.x, scale.y, scale.z);
    goalkeeperBody.visible = false;
    scene.add(goalkeeperBody);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    goalkeeperBody.userData.physicsBody = body;
}
function addGoalkeeperHands(){
    let pos = {x: 0, y: 0.92, z: -3.25};
    let scale = {x: 1.23, y: 0.1, z: 0.2};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    goalkeeperHands = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0x00ffff}));
    goalkeeperHands.position.set(pos.x, pos.y, pos.z);
    goalkeeperHands.scale.set(scale.x, scale.y, scale.z);
    goalkeeperHands.visible = false;
    scene.add(goalkeeperHands);

    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( margin );
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 4 );
    body.setRollingFriction( 10 );
    body.setCollisionFlags( FLAGS.CF_KINEMATIC_OBJECT );

    physicsWorld.addRigidBody( body );
    goalkeeperHands.userData.physicsBody = body;
}
function setupCurveForMoveGoalkeeper() {
    curve = new THREE.SplineCurve3( [
        new THREE.Vector3(  1.4,  0, -3.25 ),
        new THREE.Vector3( -1.5, 0, -3.25 )
    ], true );

    points = curve.getPoints( 50 );
    curveGeometry = new THREE.BufferGeometry().setFromPoints( points );
    curveMaterial = new THREE.LineBasicMaterial( { color : 0xff0000 });
    curveObject = new THREE.Line( curveGeometry, curveMaterial );
}
function moveGoalkeeper( newPos ) {
    goalkeeper.position.x = newPos.x;
    goalkeeper.position.y = newPos.y;
    goalkeeper.position.z = newPos.z;

    goalkeeperBody.position.x = newPos.x;
    goalkeeperBody.position.y = newPos.y;
    goalkeeperBody.position.z = newPos.z;

    goalkeeperHands.position.x = newPos.x;
    goalkeeperHands.position.y = newPos.y + 0.92;
    goalkeeperHands.position.z = newPos.z;
}

function loadShootSound(){
    shootSound = new THREE.Audio( audioListener );

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load( '../sounds/shot_on_goal.mp3', function( buffer ) {
        shootSound.setBuffer( buffer );
        shootSound.setLoop( false );
        shootSound.setVolume( 1 );
    });
}
function loadGoalSound(){
    goalSound = new THREE.Audio( audioListener );

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load( '../sounds/goal_crowd.mp3', function( buffer ) {
        goalSound.setBuffer( buffer );
        goalSound.setLoop( false );
        goalSound.setVolume( 1 );
    });
}

function moveBall(){
    let scalingFactor = 2;

    let moveX =  moveDirection.right - moveDirection.left;
    let moveZ =  moveDirection.back - moveDirection.forward;
    let moveY =  0;

    if( moveX == 0 && moveY == 0 && moveZ == 0) return;

    let resultantImpulse = new Ammo.btVector3( moveX, moveY, moveZ );
    resultantImpulse.op_mul(scalingFactor);

    let physicsBody = ball.userData.physicsBody;
    physicsBody.setLinearVelocity( resultantImpulse );
}
function setupEventHandlers(){
    window.addEventListener( 'keydown', handleKeyDown, false);
    window.addEventListener( 'keyup', handleKeyUp, false);
}
function handleKeyDown( event ){
    let keyCode = event.keyCode;

    switch( keyCode ){
        case 87: //W: FORWARD
            moveDirection.forward = 1;
            break;
        case 83: //S: BACK
            moveDirection.back = 1;
            break;
        case 65: //A: LEFT
            moveDirection.left = 1;
            break;
        case 68: //D: RIGHT
            moveDirection.right = 1;
            break;
        case 82: //R: RESET
            if( shootBallObj != null ){
                scene.remove( shootBallObj);
                shootBallObj = null;
                addBall();
            }
            break;
        case 49 || 97:
            shootBall( 1 );
            break;
        case 50 || 98:
            shootBall( 2 );
            break;
        case 51 || 99:
            shootBall( 3 );
            break;
        case 52 || 100:
            shootBall( 4 );
            break;
        case 53 || 101:
            shootBall( 5 );
            break;
        case 54 || 102:
            shootBall( 6 );
            break;
    }
}
function handleKeyUp( event ){
    let keyCode = event.keyCode;

    switch( keyCode ){
        case 87: //FORWARD
            moveDirection.forward = 0;
            break;
        case 83: //BACK
            moveDirection.back = 0;
            break;
        case 65: //LEFT
            moveDirection.left = 0;
            break;
        case 68: //RIGHT
            moveDirection.right = 0;
            break;
    }
}

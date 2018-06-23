define([
        '../render/Renderable',
        '../geom/Sector',
        '../shaders/SVSurfacePolylineProgram',
        '../geom/Vec3'
    ],
    function (Renderable,Sector, SVSurfacePolylineProgram, Vec3) {
        "use strict";

        var SVSurfacePolyline = function (locations, attributes) {
            Renderable.call(this);

            this.locations = locations;

            this.attributes = attributes;

            this.vertexArray = null;

            this.elementArray = null;

            this.program = null;

            this.vboCacheKey = null;

            this.eboCacheKey = null;

            this.sector = new Sector();

            this.minMax;
        };

        SVSurfacePolyline.prototype = Object.create(Renderable.prototype);

        SVSurfacePolyline.cacheIdCounter = 0;

        SVSurfacePolyline.prototype.reset = function () {
            this.vertexArray = null;
            this.elementArray = null;
        };

        SVSurfacePolyline.prototype.render = function (dc) {
            if (!this.enabled) {
                return;
            }
            if (this.sector.isEmpty()) {
                this.generateSector(dc);
            }
            var latestMinMax = dc.globe.elevationModel.minAndMaxElevationsForSector(this.sector);

            if (this.mustGenerateGeometry() || !this.isMinMaxSame(latestMinMax)) {
                this.minMax = latestMinMax;
                this.vboCacheKey = null;
                this.assembleGeometry(dc);
            }

            dc.addSurfaceRenderable(this);
        };

        SVSurfacePolyline.prototype.isMinMaxSame = function (latestMinMax) {
            return this.minMax[0] === latestMinMax[0] && this.minMax[1] === latestMinMax[1];
        };

        SVSurfacePolyline.prototype.generateSector = function (dc) {
            this.sector.setToBoundingSector(this.locations);
            this.minMax = dc.globe.elevationModel.minAndMaxElevationsForSector(this.sector);
        };

        SVSurfacePolyline.prototype.mustGenerateGeometry = function () {
            return !this.vertexArray;
        };

        SVSurfacePolyline.prototype.assembleGeometry = function (dc) {
            this.assembleVertexArray(dc);
            this.assembleElementArray(dc);
        };

        SVSurfacePolyline.prototype.assembleVertexArray = function (dc) {
            var cubes = this.locations.length - 1;
            this.vertexArray = new Float32Array((8 * 6) * cubes);
            var endPoint = new Vec3(), startPoint = new Vec3(), normal = new Vec3(), loc, lowerLimit, upperLimit, idx = 0;

            upperLimit = this.calculateVolumeHeight(dc) + this.minMax[1] * dc.verticalExaggeration;
            lowerLimit = this.minMax[0];

            for (var i = 1; i <= cubes; i++) {

                loc = this.locations[i - 1];
                dc.globe.computePointFromPosition(loc.latitude, loc.longitude, upperLimit, startPoint);
                loc = this.locations[i];
                dc.globe.computePointFromPosition(loc.latitude, loc.longitude, upperLimit, endPoint);
                normal.copy(startPoint).normalize();
                endPoint.normalize();
                normal.cross(endPoint).normalize();

                this.vertexArray[idx++] = startPoint[0]; // 0
                this.vertexArray[idx++] = startPoint[1];
                this.vertexArray[idx++] = startPoint[2];
                this.vertexArray[idx++] = normal[0];
                this.vertexArray[idx++] = normal[1];
                this.vertexArray[idx++] = normal[2];
                this.vertexArray[idx++] = startPoint[0]; // 1
                this.vertexArray[idx++] = startPoint[1];
                this.vertexArray[idx++] = startPoint[2];
                this.vertexArray[idx++] = -normal[0];
                this.vertexArray[idx++] = -normal[1];
                this.vertexArray[idx++] = -normal[2];

                loc = this.locations[i];
                dc.globe.computePointFromPosition(loc.latitude, loc.longitude, upperLimit, endPoint);
                this.vertexArray[idx++] = endPoint[0]; // 2
                this.vertexArray[idx++] = endPoint[1];
                this.vertexArray[idx++] = endPoint[2];
                this.vertexArray[idx++] = normal[0];
                this.vertexArray[idx++] = normal[1];
                this.vertexArray[idx++] = normal[2];
                this.vertexArray[idx++] = endPoint[0]; // 3
                this.vertexArray[idx++] = endPoint[1];
                this.vertexArray[idx++] = endPoint[2];
                this.vertexArray[idx++] = -normal[0];
                this.vertexArray[idx++] = -normal[1];
                this.vertexArray[idx++] = -normal[2];

                loc = this.locations[i - 1];
                dc.globe.computePointFromPosition(loc.latitude, loc.longitude, lowerLimit, startPoint);
                this.vertexArray[idx++] = startPoint[0]; // 4
                this.vertexArray[idx++] = startPoint[1];
                this.vertexArray[idx++] = startPoint[2];
                this.vertexArray[idx++] = normal[0];
                this.vertexArray[idx++] = normal[1];
                this.vertexArray[idx++] = normal[2];
                this.vertexArray[idx++] = startPoint[0]; // 5
                this.vertexArray[idx++] = startPoint[1];
                this.vertexArray[idx++] = startPoint[2];
                this.vertexArray[idx++] = -normal[0];
                this.vertexArray[idx++] = -normal[1];
                this.vertexArray[idx++] = -normal[2];

                loc = this.locations[i];
                dc.globe.computePointFromPosition(loc.latitude, loc.longitude, lowerLimit, endPoint);
                this.vertexArray[idx++] = endPoint[0]; // 6
                this.vertexArray[idx++] = endPoint[1];
                this.vertexArray[idx++] = endPoint[2];
                this.vertexArray[idx++] = normal[0];
                this.vertexArray[idx++] = normal[1];
                this.vertexArray[idx++] = normal[2];
                this.vertexArray[idx++] = endPoint[0]; // 7
                this.vertexArray[idx++] = endPoint[1];
                this.vertexArray[idx++] = endPoint[2];
                this.vertexArray[idx++] = -normal[0];
                this.vertexArray[idx++] = -normal[1];
                this.vertexArray[idx++] = -normal[2];
            }
        };

        SVSurfacePolyline.prototype.assembleElementArray = function (dc) {
            var cubes = this.locations.length - 1, baseIdx = 0, idx = 0, i;
            this.elementArray = new Int16Array(18 * cubes);

            for (i = 0; i < cubes; i++) {

                this.elementArray[idx++] = baseIdx;
                this.elementArray[idx++] = baseIdx + 4;
                this.elementArray[idx++] = baseIdx + 1;
                this.elementArray[idx++] = baseIdx + 5;
                this.elementArray[idx++] = baseIdx + 3;
                this.elementArray[idx++] = baseIdx + 7;
                this.elementArray[idx++] = baseIdx + 2;
                this.elementArray[idx++] = baseIdx + 6;
                this.elementArray[idx++] = baseIdx;
                this.elementArray[idx++] = baseIdx + 4;

                this.elementArray[idx++] = baseIdx + 3;
                this.elementArray[idx++] = baseIdx + 2;
                this.elementArray[idx++] = baseIdx + 1;
                this.elementArray[idx++] = baseIdx;

                this.elementArray[idx++] = baseIdx + 5;
                this.elementArray[idx++] = baseIdx + 4;
                this.elementArray[idx++] = baseIdx + 7;
                this.elementArray[idx++] = baseIdx + 6;

                baseIdx = idx;
            }

        };

        SVSurfacePolyline.prototype.calculateNearestDistanceToCamera = function (dc) {
            // determine nearest distance to camera which will define the width
            var distance = Number.MAX_VALUE, point = new Vec3(), loc;
            for (var i = 0, len = this.locations.length; i < len; i++) {
                loc = this.locations[i];
                dc.globe.computePointFromLocation(loc.latitude, loc.longitude, point);

                distance = Math.min(distance, point.distanceTo(dc.eyePoint));
            }

            return distance;
        };

        SVSurfacePolyline.prototype.renderSurface = function (dc) {
            // determine the necessary spacing based on distance
            var nearestDistance = this.calculateNearestDistanceToCamera(dc);
            // TODO transformation to maintain constant screen size, not this proportional guess
            var offset = nearestDistance / 50;

            var gl = dc.currentGlContext, vboId, eboId, refreshVbo, refreshEbo;
            gl.enable(gl.DEPTH_TEST);
            if (!this.program) {
                this.program = new SVSurfacePolylineProgram(gl);
            }

            dc.bindProgram(this.program);

            this.program.loadModelviewProjection(gl, dc.modelviewProjection);
            this.program.loadColor(gl, this.attributes.outlineColor);
            this.program.loadOffsetScale(gl, offset);

            // Vertex Buffer
            if (!this.vboCacheKey) {
                this.vboCacheKey = "SVSurfacePolylineVBOCache" + SVSurfacePolyline.cacheIdCounter++;
            }

            vboId = dc.gpuResourceCache.resourceForKey(this.vboCacheKey);
            if (!vboId) {
                vboId = gl.createBuffer();
                dc.gpuResourceCache.putResource(this.vboCacheKey, vboId, this.vertexArray.length * 4);
                refreshVbo = true;
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, vboId);
            if (refreshVbo) {
                gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
            }

            // Element Buffer
            if (!this.eboCacheKey) {
                this.eboCacheKey = "SVSurfacePolylineEBOCache" + SVSurfacePolyline.cacheIdCounter++;
            }

            eboId = dc.gpuResourceCache.resourceForKey(this.eboCacheKey);
            if (!eboId) {
                eboId = gl.createBuffer();
                dc.gpuResourceCache.putResource(this.eboCacheKey, eboId, this.elementArray.length * 2);
                refreshEbo = true;
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eboId);
            if (refreshEbo) {
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.elementArray, gl.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
            }

            gl.enableVertexAttribArray(this.program.posLocation);
            gl.enableVertexAttribArray(this.program.offsetDirectionLocation);

            gl.vertexAttribPointer(this.program.posLocation, 3, gl.FLOAT, false, 6 * 4, 0);
            gl.vertexAttribPointer(this.program.offsetDirectionLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4);

            // Setup the stencil including disabling drawing to the scene
            gl.colorMask(false, false, false, false);
            gl.depthMask(false);
            gl.enable(gl.STENCIL_TEST);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            // Turn off face culling (when enabled) and capture state for reinstatement after stencil population
            var isFaceCulling = false, frontFace = gl.CCW;
            if (gl.getParameter(gl.CULL_FACE)) {
                isFaceCulling = true;
                frontFace = gl.getParameter(gl.FRONT_FACE);
                gl.disable(gl.CULL_FACE); // turn off face culling for two sided stencil
            }
            // Capture current depth test properties
            var isDepthTesting = false, depthFunc = gl.LESS;
            if (gl.getParameter(gl.DEPTH_TEST)) {
                isDepthTesting = true;
                depthFunc = gl.getParameter(gl.DEPTH_FUNC);
            } else {
                isDepthTesting = false;
                gl.enable(gl.DEPTH_TEST);
            }
            gl.depthFunc(gl.LEQUAL);

            gl.stencilFunc(gl.ALWAYS, 0, 255);
            gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.DECR, gl.KEEP);
            gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.INCR, gl.KEEP);

            // Populate the stencil against the depth buffer and shadow volume
            this.drawShadowVolume(dc);

            // Enable the scene drawing
            gl.enable(gl.CULL_FACE);
            gl.colorMask(true, true, true, true);
            gl.depthMask(true);
            // Reinstate face culling properties
            if (isFaceCulling) {
                gl.enable(gl.CULL_FACE);
                gl.frontFace(frontFace);
            }
            // Reinstate depth function
            if (isDepthTesting) {
                gl.depthFunc(depthFunc);
            } else {
                gl.disable(gl.DEPTH_TEST);
            }

            // Apply the stencil test to drawing
            gl.stencilFunc(gl.NOTEQUAL, 0, 255);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); // maintain the stencil values

            this.drawShadowVolume(dc);

            // Suspend stencil testing
            gl.disable(gl.STENCIL_TEST);

            this.drawDiagnosticShadowVolume(dc);

            gl.disableVertexAttribArray(this.program.posLocation);
            gl.disableVertexAttribArray(this.program.offsetDirectionLocation);

        };

        SVSurfacePolyline.prototype.drawShadowVolume = function (dc) {
            var gl = dc.currentGlContext;
            gl.drawElements(gl.TRIANGLE_STRIP, 10, gl.UNSIGNED_SHORT, 0);
            gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 10 * 2);
            gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, (10 + 4) * 2);
        };

        SVSurfacePolyline.prototype.drawDiagnosticShadowVolume = function (dc) {
            var gl = dc.currentGlContext;
            this.program.loadColor(gl, WorldWind.Color.RED);
            gl.drawElements(gl.LINE_STRIP, this.elementArray.length, gl.UNSIGNED_SHORT, 0);
        };

        SVSurfacePolyline.prototype.calculateVolumeHeight = function (dc) {
            var maxAngle = -Number.MAX_VALUE, points = [], i, j, len = this.locations.length, loc, p, m, pointOne,
                pointTwo, angle, scratch = new Vec3(), c;

            for (i = 0; i < len; i++) {
                loc = this.locations[i];
                p = dc.globe.computePointFromLocation(loc.latitude, loc.longitude, new Vec3());
                m = p.magnitude();
                points.push({
                    vec: p,
                    mag: m
                });
            }

            for (i = 0; i < len; i++) {
                pointOne = points[i];
                for (j = 0; j < len; j++) {
                    if (i !== j) {
                        scratch.copy(pointOne.vec);
                        pointTwo = points[j];
                        angle = Math.acos(scratch.dot(pointTwo.vec) / (pointOne.mag * pointTwo.mag));
                        maxAngle = Math.max(maxAngle, angle);
                    }
                }
            }

            c = Math.sin(Math.PI / 2 - maxAngle / 2) * WorldWind.EARTH_RADIUS / Math.sin(Math.PI / 2);

            return WorldWind.EARTH_RADIUS - c;
        };

        return SVSurfacePolyline;
    });
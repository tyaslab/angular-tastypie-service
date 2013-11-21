angular.module('ng.tastypie', [])
.factory('tastypieService', function($http, $q) {
    var _tastypieService = function(url, fk, m2m) {
        var thisClass = this; // just the reference, thisClass self explanatory ;-)
        
        this.url = url || ''; // get url from param, fallback to ''
        this.fk = fk || []; // INCLUDING TO ONE FIELD get fk from param, fallback to []
        this.m2m = m2m || []; // get m2m from param, fallback to []
        
        // A helper function that prepares an object to tastypie-friendly data (useful for POST/PUT/PATCH method)
        this.prepareTastypie = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M();
            
            // The real function is here
            var _prepareTastypiePer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);
                
                // Inspect Foreign Key. Convert to Django Tastypie URL if exist
                for (fk_key in fk_list) {
                    if (angular.isObject(tempResult[fk_key])) {
                        tempResult[fk_key] = fk_list[fk_key].replace('{pk}', tempResult[fk_key].id);
                    } else {
                        tempResult[fk_key] = null;
                    }
                }
                
                // Inspect Many To Many Key. Convert to Django Tastypie URL if exist
                for (m2m_key in m2m_list) {
                    if (angular.isArray(tempResult[m2m_key])) {
                        tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                            if (el_tr) {
                                tempResult[m2m_key][idx_tr] = m2m_list[m2m_key].replace('{pk}', el_tr);
                            }
                        });
                    } else {
                        tempResult[m2m_key] = [];
                    }
                }
                
                // If a data is blank, convert it to null
                for (key in tempResult) {
                    if (!tempResult[key]) {
                        tempResult[key] = null;
                    }
                }
                
                // finally return the data
                return tempResult;
            }
            
            // if parameter is array (object list)
            if (angular.isArray(object)) {
                result = [];
                object.forEach(function(el, idx, ar) {
                    result.push(_prepareTastypiePer(el));
                });
            // if parameter is single object
            } else {
                result = _prepareTastypiePer(object);
            }

            return result;
        };
        
        // A helper function that prepares an object to angularjs-friendly data (useful for GET method)
        this.prepareFrontEnd = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M();

            // The real function is here
            var _prepareFrontEndPer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);
                
                // Inspect Foreign Key. Convert to {id: value} if exist.
                for (fk_key in fk_list) {
                    if (!tempResult[fk_key] === null) {
                        tempResult[fk_key] = {
                            id : null
                        };
                    }
                }
                
                // Inspect Many To Many Key. Take the id only
                for (m2m_key in m2m_list) {
                    if (angular.isArray(tempResult[m2m_key])) {
                        tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                            if (el_tr.id) {
                                tempResult[m2m_key][idx_tr] = el_tr.id;
                            }
                        });
                    } else {
                        tempResult[m2m_key] = [];
                    }
                }
                
                // finally return the data
                return tempResult;
            }
            
            // if parameter is array (object list)
            if (angular.isArray(object)) {
                result = [];
                
                object.forEach(function(el, idx, ar) {
                    result.push(_prepareFrontEndPer(el));
                });
            // if parameter is single object
            } else {
                result = _prepareFrontEndPer(object);
            }
            return result;
        };
        
        // setter function for url. automatically add trailing shash
        this.setUrl = function(url) {
            if (url) {
                if (url[url.length-1] != '/') {
                    url = url + '/';
                }
                thisClass.url = url;
            }
        };
        
        // getter function for url
        this.getUrl = function() {
            return thisClass.url;
        };
        
        // setter function for fk
        this.setFK = function(fk_obj) {
            if (fk_obj) {
                thisClass.fk = fk_obj;
            }
        };
        
        // getter function for fk
        this.getFK = function() {
            return thisClass.fk;
        };
        
        // setter function for m2m
        this.setM2M = function(m2m_obj) {
            if (m2m_obj) {
                thisClass.m2m = m2m_obj;
            }
        };
        
        // getter function for m2m
        this.getM2M = function() {
            return thisClass.m2m;
        };
        
        // get an object via id (GET method)
        // the result is available via results.data (which has been prepareFrontEnd-ed)
        this.get = function(id) {
            var deferred = $q.defer();
            $http.get(thisClass.url + id).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results, theResults);
                    
                    var theData = {};
                    angular.copy(results.data, theData);
                    theData = thisClass.prepareFrontEnd(theData);
                    
                    theResults.data = theData;
                    
                    deferred.resolve(theResults);
                },
                function(errors) {
                    deferred.reject(errors);
                }
            );
            return deferred.promise;
        };
        
        // get data list (GET method) (filter & order capable [if specified])
        // ATTENTION: The result is available via results.data (NOT results.data.objects)
        //            meta can be found at results.meta
        this.getList = function(filter) {
            var deferred = $q.defer();
            
            if (filter) {
                filter = '?' + filter;
            } else {
                filter = '';
            }
            
            $http.get(thisClass.url + filter).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results, theResults);
                    var theData = [];
                    angular.copy(results.data.objects, theData);
                    theData = thisClass.prepareFrontEnd(theData);
                    
                    theResults.data = theData;
                    theResults.meta = results.data.meta;
                    
                    deferred.resolve(theResults);
                },
                function(errors) {
                    deferred.reject(errors);
                }
            );
            
            return deferred.promise;
        };
        
        // add an object (POST method)
        this.add = function(object) {
            var theObject = thisClass.prepareTastypie(object);
            var deferred = $q.defer();
            $http.post(thisClass.getUrl(), theObject).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results, theResults);
                    
                    var theData = {};
                    angular.copy(results.data, theData);
                    theData = thisClass.prepareFrontEnd(theData);
                    
                    theResults.data = theData;
                    
                    deferred.resolve(theResults);
                },
                function(errors) {
                    deferred.reject(errors);
                }
            );
            
            return deferred.promise;
        };
        
        // update an object (PUT method)
        this.update = function(object) {
            var theObject = thisClass.prepareTastypie(object);
            var deferred = $q.defer();
            
            $http.put(thisClass.getUrl() + object.id + '/', theObject).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results, theResults);
                    
                    var theData = {};
                    angular.copy(results.data, theData);
                    theData = thisClass.prepareFrontEnd(theData);
                    
                    theResults.data = theData;
                    
                    deferred.resolve(theResults);
                },
                function(errors) {
                    deferred.reject(errors);
                }
            );
            
            return deferred.promise;
        };
        
        // this can do add or update automagically. If object has id then update, otherwise create one.
        this.save = function(object) {
            if (!object.id) {
                return thisClass.add(object);
            } else {
                return thisClass.update(object);
            }
        };
        
        // delete an object
        this.delete = function(id) {
            return $http.delete(thisClass.url + id + '/');
        };
        
        // the bulk operation (creating, updating, and deleting) (PATCH method)
        // You can specify up to three parameters
        // If 1 parameter specified, do the CREATE/UPDATE operation
        // If 2 parameters specified, do the CREATE/UPDATE and DELETE operations
        // If 3 parameters specified, do the CREATE/UPDATE, DELETE, and CREATE operations
        // this function will automagically prepare tastypie-friendly data for bulk operation
        this.bulk = function(objects, deleted_objects, new_objects) {
            var theObjects = [];
            var theNewObjects = [];
            
            angular.copy(thisClass.prepareTastypie(objects), theObjects);
            if (new_objects) {
                angular.copy(thisClass.prepareTastypie(new_objects), theNewObjects);
                theObjects = theObjects.concat(theNewObjects);
            }
            
            var theBulkObjects = {
                objects : theObjects
            }
            
            if (deleted_objects) {
                var theDeleteds = [];
                angular.copy(thisClass.prepareTastypie(deleteds), theDeleteds);
                
                // convert deleted objects to tastypie URL
                theDeleteds.forEach(function(el, idx, ar) {
                    theDeleteds[idx] = thisClass.getUrl() + el.id + '/';
                });
                
                theBulkObjects.deleted_objects = theDeleteds;
            }
            
            var deferred = $q.defer();
            
            $http({
                method : 'POST',
                url : thisClass.getUrl(),
                data : theBulkObjects,
                headers : {
                    'X-HTTP-Method-Override' : 'PATCH'
                }
            }).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results, theResults);
                    
                    var theData = [];
                    angular.copy(results.data.objects, theData);
                    theData = thisClass.prepareFrontEnd(theData);
                    
                    theResults.data = theData;
                    theResults.meta = results.data.meta;
                    
                    deferred.resolve(theResults);
                },
                function(errors) {
                    deferred.reject(errors);
                }
            );
            
            return deferred.promise;
        };
    
        this.setUrl(this.url);
        this.setFK(this.fk);
        this.setM2M(this.m2m);
    
    };
    
    return _tastypieService
});

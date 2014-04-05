angular.module('tyaslab.tastypie', [])
.factory('tastypieService', function($http, $q) {
    var _tastypieService = function(optionsParam) {
        var thisClass = this; // just the reference, thisClass self explanatory ;-)
        this.optionsParam = optionsParam;
        this.object_from_server = {};
        this.object_list_from_server = [];
        this.meta_from_server = {};
        
        // Prepares an object to tastypie-friendly data (useful for POST/PUT/PATCH method)
        this.prepareTastypie = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M(),
                edit_related = thisClass.getEditRelated(),
                keep_full = thisClass.getKeepFull();
            
            // The real function is here
            var _prepareTastypiePer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);

                // Inspect Foreign Key. Convert to Django Tastypie URL if exist
                for (fk_key in fk_list) {
                    if (!(thisClass._keyIn(fk_key, edit_related, fk_list))) {
                        if (tempResult[fk_key]) {
                            if (!(thisClass._keyIn(fk_key, keep_full, fk_list))) {
                                // tempResult[fk_key] = fk_list[fk_key].replace('{pk}', tempResult[fk_key]);
                                tempResult[fk_key] = thisClass._urlTrailingSlash(
                                    thisClass._urlTrailingSlash(fk_list[fk_key]) + tempResult[fk_key]
                                );
                            } else {
                                tempResult[fk_key] = thisClass._urlTrailingSlash(
                                    thisClass._urlTrailingSlash(fk_list[fk_key]) + tempResult[fk_key].id
                                );
                            }
                        } else {
                            tempResult[fk_key] = null;
                        }
                    }
                }
                
                // Inspect Many To Many Key. Convert to Django Tastypie URL if exist
                for (m2m_key in m2m_list) {
                    if (!(thisClass._keyIn(m2m_key, edit_related, m2m_list))) {
                        if (tempResult[m2m_key]) {
                            tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                                if (el_tr) {
                                    if (!(thisClass._keyIn(m2m_key, edit_related, m2m_list))) {
                                        // tempResult[m2m_key][idx_tr] = m2m_list[m2m_key].replace('{pk}', el_tr);
                                        tempResult[m2m_key][idx_tr] = thisClass._urlTrailingSlash(
                                            thisClass._urlTrailingSlash(m2m_list[m2m_key]) + el_tr
                                        );
                                    } else {
                                        tempResult[m2m_key][idx_tr] = thisClass._urlTrailingSlash(
                                            thisClass._urlTrailingSlash(m2m_list[m2m_key]) + el_tr.id
                                        );
                                    }
                                }
                            });
                        } else {
                            tempResult[m2m_key] = []
                        }
                    }
                }
                
                // If a data is blank, convert it to null
                for (key in tempResult) {
                    if (tempResult[key] === undefined || tempResult[key] === '') {
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

        // Prepares an object to angularjs-friendly data (useful for GET method)
        this.prepareFrontEnd = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M(),
                edit_related = thisClass.getEditRelated(),
                keep_full = thisClass.getKeepFull();

            // The real function is here
            var _prepareFrontEndPer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);

                // Inspect Foreign Key. Convert to id of value if exist.
                for (fk_key in fk_list) {

                    // if inspected field is not null
                    if (tempResult[fk_key]) {
                        // if inspected field is not editable or not kept full
                        if (!(thisClass._keyIn(fk_key, edit_related, fk_list)) && !(thisClass._keyIn(fk_key, keep_full, fk_list))) {
                            if (angular.isObject(tempResult[fk_key])) {
                                // if inspected field is an object, then get the ID only
                                tempResult[fk_key] = tempResult[fk_key].id;
                            } else {
                                // If inspected field is not an object, that is, a resource uri,
                                // then get the id of it
                                var resUri = tempResult[fk_key].split('/');
                                var idPosition = resUri.length - 2;
                                tempResult[fk_key] = parseInt(resUri[idPosition]);
                            }
                        } else {
                            // if inspected field is editable, then don't convert anything.
                            // But make sure that it is editable.
                            if (!angular.isObject(tempResult[fk_key])) {
                                console.warn('You have chosen to use ' + fk_key + ' field editable or kept full, but you didn\'t specify "full=True" in your resource.');
                            }
                        }
                    } else if (tempResult[fk_key] === undefined) {
                        console.warn('Field ' + fk_key + ' does not exist!');
                    }

                }
                
                // Inspect Many To Many Key. Take the id only
                for (m2m_key in m2m_list) {
                    if (tempResult[m2m_key]) {
                        if (!(thisClass._keyIn(m2m_key, edit_related, m2m_list)) && !(thisClass._keyIn(m2m_key, keep_full, m2m_list))) {
                            tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                                if (angular.isObject(el_tr)) {
                                    // if inspected field is an object, then get the ID only
                                    tempResult[m2m_key][idx_tr] = el_tr.id;
                                } else {
                                    // If inspected field is not an object, that is, a resource uri,
                                    // then get the id of it
                                    var resUri = el_tr.split('/');
                                    var idPosition = resUri.length - 2;
                                    tempResult[m2m_key][idx_tr] = parseInt(resUri[idPosition]);
                                }
                            });
                        } else {
                            if (!angular.isObject(tempResult[m2m_key])) {
                                console.warn('You have chosen to use this field editable or kept full, but you didn\'t specify "full=True" in your resource.');
                            }
                        }
                    } else if (tempResult[m2m_key] === undefined) {
                        console.warn('Field ' + m2m_key + ' does not exist!');
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
        
        // Converts object to url param string
        this._objToParamStr = function(object) {
            var results = '';
            if (angular.isObject(object)) {
                if (Object.keys(object).length > 0) {
                    var tempStrList = [];
                    for (key in object) {
                        if (object[key] !== null) {
                            tempStrList.push(key + '=' + object[key].toString());
                        }
                    }
                    results = '?' + tempStrList.join('&');
                }
            } else if (angular.isString(object)) {
                if (object) {
                    results = '?' + object;
                }
            }
            return results;
        };

        // Checks whether key is in a list of key (Javascript is weird, ya!)
        this._keyIn = function(checked_key, key_list, obj) {
            generatedObject = {};
            for (var x = 0; x < key_list.length; x++) {
                generatedObject[key_list[x]] = obj[key_list[x]];
            }

            return checked_key in generatedObject;
        };

        // add trailing slash to url
        this._urlTrailingSlash = function(url) {
            var theUrl = '';
            if (url) {
                if (url[url.length-1] != '/') {
                    url = url + '/';
                }
                theUrl = url;
            }

            return theUrl;
        };
        
        // GETTERS

        // getter function for url
        this.getUrl = function() {
            return thisClass._urlTrailingSlash(thisClass.options.apiUrl);
        };
        
        // getter function for fk
        this.getFK = function() {
            return thisClass.options.fk;
        };
        
        // getter function for m2m
        this.getM2M = function() {
            return thisClass.options.m2m;
        };

        this.getEditRelated = function() {
            return thisClass.options.editRelated;
        }

        this.getKeepFull = function() {
            return thisClass.options.keepFull;
        }

        // get "RAW" objects (not prepared to tastypie). Useful for saving fk
        this.getObjectFromServer = function() {
            return thisClass.object_from_server;
        };

        this.getObjectListFromServer = function() {
            return thisClass.object_list_from_server;
        };

        this.getMetaFromServer = function() {
            return thisClass.meta_from_server;
        };

        // END OF GETTERS

        // get an object via id (GET method)
        // the result is available via results.data (which has been prepareFrontEnd-ed)
        this.get = function(id, params) {
            var deferred = $q.defer();

            $http.get(thisClass._urlTrailingSlash(thisClass.getUrl() + id) + thisClass._objToParamStr(params)).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results.data, thisClass.object_from_server);
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
            
            $http.get(thisClass.getUrl() + thisClass._objToParamStr(filter)).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results.data.objects, thisClass.object_list_from_server);
                    angular.copy(results.data.meta, thisClass.meta_from_server);
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
        this.add = function(object, params) {
            var theObject = thisClass.prepareTastypie(object);
            var deferred = $q.defer();
            $http({
                method : 'POST',
                url : thisClass.getUrl() + thisClass._objToParamStr(params),
                data : theObject
            }).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results.data, thisClass.object_from_server);
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
        this.update = function(object, params) {
            var theObject = thisClass.prepareTastypie(object);
            var deferred = $q.defer();
            
            $http({
                method : 'PUT',
                url : thisClass._urlTrailingSlash(thisClass.getUrl() + object.id) + thisClass._objToParamStr(params),
                data : theObject
            }).then(
                function(results) {
                    var theResults = {};
                    angular.copy(results.data, thisClass.object_from_server);
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
        this.save = function(object, params) {
            if (!object.id) {
                return thisClass.add(object, params);
            } else {
                return thisClass.update(object, params);
            }
        };
        
        // delete an object
        this.delete = function(id, params) {
            return $http({
                method : 'DELETE',
                url : thisClass._urlTrailingSlash(thisClass.getUrl() + id) + thisClass._objToParamStr(params)
            });
        };
        
        // the bulk operation (creating, updating, and deleting) (PATCH method)
        // You can specify up to three parameters
        // If 1 parameter specified, do the CREATE/UPDATE operation
        // If 2 parameters specified, do the CREATE/UPDATE and DELETE operations
        // If 3 parameters specified, do the CREATE/UPDATE, DELETE, and CREATE operations
        // this function will automagically prepare tastypie-friendly data for bulk operation
        // TODO: add params
        this.saveAll = function(objects, deleted_objects, new_objects) {
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

                angular.copy(thisClass.prepareTastypie(deleted_objects), theDeleteds);
                                
                // convert deleted objects to tastypie URL
                theDeleteds.forEach(function(el, idx, ar) {
                    theDeleteds[idx] = thisClass._urlTrailingSlash(thisClass.getUrl() + el.id);
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
                    angular.copy(results.data.objects, thisClass.object_list_from_server);
                    angular.copy(results.data.meta, thisClass.meta_from_server);
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
    
        this.init = function() {
            thisClass.options = {
                apiUrl : '',
                fk : {},
                m2m : {},
                editRelated : [],
                keepFull : []
            };
            angular.extend(thisClass.options, thisClass.optionsParam);
        };
        // INITIALIZATION
        this.init();
    };
    
    return _tastypieService
});

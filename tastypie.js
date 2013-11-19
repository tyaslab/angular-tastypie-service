angular.module('ng.tastypie', [])
.factory('tastypieService', function($http, $rootScope) {
    var _tastypieService = function(url, fk, m2m) {
        var thisClass = this;
        this.url = url || '';
        this.fk = fk || []; // INCLUDING TO ONE FIELD
        this.m2m = m2m || [];
        this.object_list = [];
        this.object = {};
        
        this.prepareTastypie = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M();
    
            var _prepareTastypiePer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);
                
                for (fk_key in fk_list) {
                    if (angular.isObject(tempResult[fk_key])) {
                        tempResult[fk_key] = fk_list[fk_key].replace('{pk}', tempResult[fk_key].id);
                    } else {
                        tempResult[fk_key] = null;
                    }
                }
                
                for (m2m_key in m2m_list) {
                    if (angular.isArray(tempResult[m2m_key])) {
                        tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                            if (el_tr) {
                                el_tr = m2m_list[m2m_key].replace('{pk}', el_tr);
                            }
                        });
                    } else {
                        tempResult[m2m_key] = [];
                    }
                }
                
                return tempResult;
            }
            
            if (angular.isArray(object)) {
                result = [];
                
                object.forEach(function(el, idx, ar) {
                    result.push(_prepareTastypiePer(el));
                });
            } else {
                result = _prepareTastypiePer(result);
            }
            
            return result;
        };
        
        this.prepareFrontEnd = function(object) {
            var result = null,
                fk_list = thisClass.getFK(),
                m2m_list = thisClass.getM2M();
    
            var _prepareFrontEndPer = function(obj) {
                var tempResult = {};
                angular.copy(obj, tempResult);
                
                for (fk_key in fk_list) {
                    if (!tempResult[fk_key] === null) {
                        tempResult[fk_key] = {
                            id : null
                        };
                    }
                }
                
                for (m2m_key in m2m_list) {
                    if (angular.isArray(tempResult[m2m_key])) {
                        tempResult[m2m_key].forEach(function(el_tr, idx_tr, ar_tr) {
                            if (el_tr.id) {
                                el_tr = el_tr.id;
                            }
                        });
                    } else {
                        tempResult[m2m_key] = [];
                    }
                }
                
                return tempResult;
            }
            
            if (angular.isArray(object)) {
                result = [];
                
                object.forEach(function(el, idx, ar) {
                    result.push(_prepareFrontEndPer(el));
                });
            } else {
                result = _prepareFrontEndPer(result);
            }
            
            return result;
        };
        
        this.setUrl = function(url) {
            if (url) {
                if (url[url.length-1] != '/') {
                    url = url + '/';
                }
                thisClass.url = url;
            }
        };
        
        this.getUrl = function() {
            return thisClass.url;
        };
        
        this.setFK = function(fk_obj) {
            if (fk_obj) {
                thisClass.fk = fk_obj;
            }
        };
        
        this.getFK = function() {
            return thisClass.fk;
        };
        
        this.setM2M = function(m2m_obj) {
            if (m2m_obj) {
                thisClass.m2m = m2m_obj;
            }
        };
        
        this.getM2M = function() {
            return thisClass.m2m;
        };
        
        this.get = function(id) {
            return $http.get(thisClass.url + id + '/');
        };
        
        this.getList = function(filter) {
            if (filter) {
                filter = '?' + filter;
            } else {
                filter = '';
            }
            return $http.get(thisClass.url + filter);
        };
        
        this.add = function(object) {
            var theObject = thisClass.prepareTastypie(object);
            return $http.post(theObject);
        };
        
        this.update = function(object) {
            var theObject = _prepareTastypie(object);
            return $http.put(thisClass.url + object.id, theObject);
        };
        
        this.save = function(object) {
            var theObject = {};
            angular.copy(thisClass.prepareTastypie(object), theObject);
            if (!theObject.id) {
                return thisClass.add(theObject);
            } else {
                return thisClass.update(theObject);
            }
        };
        
        this.delete = function(id) {
            return $http.delete(thisClass.url + id + '/');
        };
        
        this.bulk = function(objects, deleteds) {
            var theObjects = [];
            
            angular.copy(thisClass.prepareTastypie(objects), theObjects);
            
            var theBulkObjects = {
                objects : theObjects
            }
            
            if (deleteds) {
                var theDeleteds = [];
                angular.copy(thisClass.prepareTastypie(deleteds), theDeleteds);
                theBulkObjects.deleted = theDeleteds;
            }
            
            return $http({
                method : 'POST',
                url : thisClass.url,
                data : theBulkObjects,
                headers : {
                    'X-HTTP-Method-Override' : 'PATCH'
                }
            });
        };
    
    };
    return _tastypieService
});

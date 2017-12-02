function nodesAndEdgesFromDataSource(ds) {
    // group: [1, 1, 2, 3] -> [[1, 1], [2], [3]]
    function group(items, isSameGroup) {
      function merge(y, xs, isSameGroup) {
        if (0 == xs.length) {
          return {'merged': true, 'result': [y]};
        }
        const x = xs[0];
        const sameGroup = isSameGroup(x, y);
        if (sameGroup) {
          return {'merged': true, 'result': xs.concat([y])};
        } else {
          return {'merged': false, 'result': xs};
        }
      }
      return items.reduce(function(groups, item){
        const mergedResult = groups.reduce(function(acc, group){
          const mergedResult = merge(item, group, isSameGroup);
          return {'merged': (acc.merged || mergedResult.merged), 'result': acc.result.concat([mergedResult.result])};
        }, {'merged': false, 'result': []});
        if (mergedResult.merged) {
          return mergedResult.result;
        } else {
          return mergedResult.result.concat([[item]]);
        }
      }, []);
    }

    function isEqual(value, other) {

        // Get the value type
        var type = Object.prototype.toString.call(value);

        // If the two objects are not the same type, return false
        if (type !== Object.prototype.toString.call(other)) return false;

        // If items are not an object or array, return false
        if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

        // Compare the length of the length of the two items
        var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
        var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
        if (valueLen !== otherLen) return false;

        // Compare two items
        var compare = function (item1, item2) {

            // Get the object type
            var itemType = Object.prototype.toString.call(item1);

            // If an object or array, compare recursively
            if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
                if (!isEqual(item1, item2)) return false;
            }

            // Otherwise, do a simple comparison
            else {

                // If the two items are not the same type, return false
                if (itemType !== Object.prototype.toString.call(item2)) return false;

                // Else if it's a function, convert to a string and compare
                // Otherwise, just compare
                if (itemType === '[object Function]') {
                    if (item1.toString() !== item2.toString()) return false;
                } else {
                    if (item1 !== item2) return false;
                }

            }
        };

        // Compare properties
        if (type === '[object Array]') {
            for (var i = 0; i < valueLen; i++) {
                if (compare(value[i], other[i]) === false) return false;
            }
        } else {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    if (compare(value[key], other[key]) === false) return false;
                }
            }
        }

        // If nothing failed, return true
        return true;

    };

    zip= rows=>rows[0].map((_,c)=>rows.map(row=>row[c]))
    // function zip(arrays) {
    //   return arrays[0].map(function(_,i){
    //     return arrays.map(function(array){return array[i]})
    //   });
    // }

    const packages = ds.data.packageList;
    const packagesWithNodes = packages.map(function(pkg) {
      const videoNodes = pkg.videoList.map(function(videoURL){
        return {id: 0, label: videoURL, shape: 'square', color: '#57AAFF'};
      });
      const questionNode = pkg.questionInfo.questionId ? {id: 0, label: 'questionId: ' + pkg.questionInfo.questionId, shape: 'dot', color: '#57AAFF'} : undefined;
      const nodes = [].concat(videoNodes).concat(questionNode ? [questionNode] : []);
      const mapOptionToPackage = pkg.questionInfo.questionId ? pkg.questionInfo.questionItem.reduce(function(acc, option){
        acc[option.code] = option.packageId;
        return acc;
      }, {}) : {};
      function mergeMapOptionToPackage(mapOptionToPackage) {
        const originalEntries = Object.entries(mapOptionToPackage);
        if (0 == originalEntries.length) {
          return mapOptionToPackage;
        }

        const mergedEntries = group(originalEntries, function(x, y){
          return x[1] === y[1];  // same value
        });
        return mergedEntries.reduce(function(acc, entryGroup){
          const entryValue = entryGroup[0][1];
          const entryKey = entryGroup.map(function(entry){
            return entry[0];
          }).join(' / ');
          acc[entryKey] = entryValue;
          return acc;
        }, {});
      }
      return {
        'packageId' : pkg.packageId,
        'nodes' : nodes,
        'mapOptionToPackage' : mergeMapOptionToPackage(mapOptionToPackage)
      };
    });

    // add id for nodes
    packagesWithNodes.reduce(function(idx, pkg){
      pkg.nodes.reduce(function(iidx, node){
        node.id = iidx;
        return iidx + 1;
      }, idx);
      const count = pkg.nodes.length;
      return idx + count;
    }, 0);
    const nodes = packagesWithNodes.map(function(pkg){
      return pkg.nodes;
    }).reduce(function(acc, nodes){
      return acc.concat(nodes);
    }, []);
    // mark entrance of map
    nodes[0].color = '#FF7657';

    const mapPackageIdToPackage = packagesWithNodes.reduce(function(acc, pkg){
      acc[pkg.packageId] = pkg;
      return acc;
    }, {});

    const edges = packagesWithNodes.map(function(pkg){
      const nodes = pkg.nodes;
      if (0 == nodes.length) {
        return [];
      }

      // connect inner nodes
      const innerEdges = (nodes.length > 1) ? zip([nodes.slice(1), nodes]).map(function(pair){
        const fromNode = pair[1];
        const toNode = pair[0];
        return {from: fromNode.id, to: toNode.id, arrows:'to'};
      }) : [];

      // connect packages
      const outterFromNode = nodes[nodes.length-1];
      const mapOptionToPackageEntries = Object.entries(pkg.mapOptionToPackage);
      const outterEdges = (mapOptionToPackageEntries.length > 0) ? mapOptionToPackageEntries.map(function(keyValue){
        const optionCode = keyValue[0];
        const toPackageId = keyValue[1];
        const outterToNode = mapPackageIdToPackage[toPackageId].nodes[0];
        return {from: outterFromNode.id, to: outterToNode.id, label: optionCode, arrows:'to'};
      }) : [];
      if (0 == outterEdges.length) {  // mark entrance of map
        outterFromNode.color = '#61FF57';
      }

      return [].concat(innerEdges).concat(outterEdges);
    }).reduce(function(acc, item){
      return acc.concat(item);
    }, []);

    // remove duplicated node and edges
    function removeDuplicated(edges, nodes) {

      function outletsOfNode(node) {
        return edges.filter(function(edge){
          return edge.from === node.id;
        });
      }

      function inletsOfNode(node) {
        return edges.filter(function(edge){
          return edge.to === node.id;
        });
      }

      const nodeGroups = group(nodes, function(x, y) {
        const sameLabel = x.label === y.label;
        const sameOutlets = isEqual(outletsOfNode(x).map(e => e.to), outletsOfNode(y).map(e => e.to));
        return sameLabel && sameOutlets;
      });

      return nodeGroups.reduce(function(acc, group){
        const mergedNode = group[0];

        // update inlets
        const inlets = group.map(node => inletsOfNode(node)).reduce(function(result, inletGroup){
          return result.concat(inletGroup);
        }, []);
        inlets.forEach(edge => edge.to = mergedNode.id);

        // collect outlets
        const outlets = outletsOfNode(mergedNode);

        return {'edges': acc.edges.concat(outlets), 'nodes': acc.nodes.concat([mergedNode])};
      }, {'edges': [], 'nodes': []});
    }

    return removeDuplicated(edges, nodes);

    // return {
    //   'edges' : edges,
    //   'nodes' : nodes
    // };
  }

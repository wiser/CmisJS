import { cmis } from './cmis';
import { assert } from 'chai';
import 'mocha';

let username = 'admin';
let password = 'admin';
let url = 'https://cmis.alfresco.com/cmisbrowser';


if (undefined !== process && undefined != process.env) {

  url = process.env.CMIS_URL || url;
  username = process.env.CMIS_USERNAME || username;
  password = process.env.CMIS_PASSWORD || password;

} else if (undefined !== window) {

  var q = window.location.search.substring(1).split('&');

  for (var i = 0; i < q.length; i++) {

    var p = q[i].split("=");

    if (p[0] == 'username') {
      username = p[1];
    }
    if (p[0] == 'password') {
      password = p[1];
    }
  }
}

let session = new cmis.CmisSession(url);
session.setCredentials(username, password);

//session.setErrorHandler(err => console.log(err.stack));

describe('CmisJS library test', function () {

  this.timeout(10000);

  it('should connect to a repository', () => {
    return session.loadRepositories().then(() => {
      assert(parseFloat(session.defaultRepository.cmisVersionSupported) >= .99, "CMIS Version should be at least 1.0");
      //session.defaultRepository.repositoryUrl = session.defaultRepository.repositoryUrl.replace('18080','8888');
      //session.defaultRepository.rootFolderUrl = session.defaultRepository.rootFolderUrl.replace('18080','8888');
      console.log(session.defaultRepository.rootFolderUrl);

    }).catch(err => assert.isNotOk(err,'Promise error'));
  });

  it('should get repository informations', () => {
    return session.getRepositoryInfo().then(data => {
      var id = session.defaultRepository.repositoryId;
      assert(id == data[id].repositoryId, "id should be the same");
    });
  });

  it('should get type children definitions', () => {
    return session.getTypeChildren().then(data => {
      assert(data.numItems > 0, "Some types should be defined");
    });
  });

  it('should get type descendants definitions', () => {
    return session.getTypeDescendants(null, 5).then(data => {
      assert(data, "Response should be ok");
    });
  });

  it('should get type definition', () => {
    return session.getTypeDefinition('cmis:document')
      .then(data => {
        assert(data.propertyDefinitions['cmis:name'] !== undefined,
          "cmis:document should have cmis:name property")
      });
  });

  it('should get checked out documents', () => {
    return session.getCheckedOutDocs()
      .then(data => {
        assert(data.objects !== undefined, "objects should be defined");
      });
  });

  it('should query the repository', () => {
    return session.query("select * from cmis:document", false, {
      maxItems: 3
    })
      .then(data => {
        assert(data.results.length == 3, 'Should find 3 documents');
      }).catch(err => {
        assert.isNotOk(err,'Promise error');
      });
  });


  var testType = {
    id: 'test:testDoc',
    baseId: 'cmis:document',
    parentId: 'cmis:document',
    displayName: 'Test Document',
    description: 'Test Document Type',
    localNamespace: 'local',
    localName: 'test:testDoc',
    queryName: 'test:testDoc',
    fileable: true,
    includedInSupertypeQuery: true,
    creatable: true,
    fulltextIndexed: false,
    queryable: false,
    controllableACL: true,
    controllablePolicy: false,
    propertyDefinitions: {
      'test:aString': {
        id: 'test:aString',
        localNamespace: 'local',
        localName: 'test:aString',
        queryName: 'test:aString',
        displayName: 'A String',
        description: 'This is a String.',
        propertyType: 'string',
        updatability: 'readwrite',
        inherited: false,
        openChoice: false,
        required: false,
        cardinality: 'single',
        queryable: true,
        orderable: true,
      }
    }
  }

  it('should create a new type', () => {
    return session.createType(testType).then(data => {
      assert(data
          , "Response should be ok");
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.warn("Type creation is not supported in this repository")
        });
      } else {
        return assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should update a type', () => {
    return session.updateType(testType).then(data => {
      assert(data, "Response should be ok");
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.warn("Type creation is not supported in this repository")
        });
      } else {
        return assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should delete a type', () => {
    return session.deleteType(testType.id).then(data => {
      assert(data, "Response should be ok");
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.warn("Type creation is not supported in this repository")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  let rootId: string;

  it('should retrieve an object by path', () => {
    return session.getObjectByPath('/').then(data => {
      rootId = data.succinctProperties['cmis:objectId'];
      assert(data.succinctProperties['cmis:name'] !== undefined,
        'name should be defined');
    });
  });


  it('should retrieve an object by id', () => {
    return session.getObject(rootId).then(data => {
      rootId = data.succinctProperties['cmis:objectId'];
      assert(data.succinctProperties['cmis:path'] == '/',
        'root object path should be /');
    });
  });

  var specialChars = ['a'];//["č"];
  var randomFolder = "CmisJS" + specialChars[Math.floor(Math.random() * specialChars.length)] + Math.random();

  it('should non found this path', () => {
    return session.getObjectByPath("/" + randomFolder).catch(err => {
      let httpError = err as cmis.HTTPError;
      assert(httpError.response.status == 404, 'object should not exist');
    });
  });

  var randomFolderId;
  var firstChildId;
  var secondChildId;
  it('should create some folders', () => {
    return session.createFolder(rootId, randomFolder).then(data => {
      randomFolderId = data.succinctProperties['cmis:objectId'];
      return session.createFolder(randomFolderId, 'First Level').then(data2 => {
        firstChildId = data2.succinctProperties['cmis:objectId'];
        return session.createFolder(firstChildId, 'Second Level').then(data3 => {
          secondChildId = data3.succinctProperties['cmis:objectId'];
          assert(secondChildId !== undefined, 'objectId should be defined');
        });
      });
    });
  });

  it('should return object children', () => {
    return session.getChildren(randomFolderId).then(data => {
      assert(
        data.objects[0].object.succinctProperties['cmis:name'] == 'First Level', "Should have a child named 'First Level'");
    });
  });

  it('should return object descendants', () => {
    return session.getDescendants(randomFolderId).then(data => {
      assert(
        data[0].object.object.succinctProperties['cmis:name'] == 'First Level', "Should have a child named 'First Level'");
      assert(
        data[0].children[0].object.object.succinctProperties['cmis:name'] == 'Second Level', "Should have a descendant named 'First Level'");
    });
  });

  it('should return folder tree', () => {
    return session.getFolderTree(randomFolderId).then(data => {
      assert(
        data[0].object.object.succinctProperties['cmis:name'] == 'First Level', "Should have a child named 'First Level'");
      assert(
        data[0].children[0].object.object.succinctProperties['cmis:name'] == 'Second Level', "Should have a descendant named 'First Level'");
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.log("Get folder tree is not supported in this repository")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should return folder parent', () => {
    return session.getFolderParent(randomFolderId).then(data => {
      assert(
        data.succinctProperties['cmis:objectId'] == rootId,
        "should return root folder");
    });
  });

  it('should return object parents', () => {
    return session.getParents(randomFolderId).then(data => {
      assert(
        data[0].object.succinctProperties['cmis:objectId'] == rootId,
        "should return root folder");
    });
  });

  it('should return allowable actions', () => {
    return session.getAllowableActions(randomFolderId).then(data => {
      assert(
        data.canCreateDocument !== undefined,
        "create document action should be defined");
    });
  });

  it('should return object properties', () => {
    return session.getProperties(randomFolderId).then(data => {
      assert(
        data['cmis:name'] == randomFolder,
        "folder name should be " + randomFolder);
    });
  });

  it('should update object properties', () => {
    return session.updateProperties(firstChildId, {
      'cmis:name': 'First Level Renamed'
    }).then(data => {
      assert(
        data.succinctProperties['cmis:name'] == 'First Level Renamed',
        "folder name should be 'First Level Renamed'");
    });
  });

  it('should move specified object', () => {
    return session.moveObject(secondChildId, firstChildId, randomFolderId).then(data => {
      assert(data.succinctProperties['cmis:parentId'] == randomFolderId,
        "Parent folder id should be " + randomFolderId);
    });
  });

  let docId: string;
  let versionSeriesId: string;
  let txt: string = 'this is the document content';
  it('should create a document', () => {
    var aces = {}
    aces[username] = ['cmis:read'];
    return session.createDocument(randomFolderId, txt, 'test.txt',
      'text/plain', undefined, undefined, aces).then(data => {
        docId = data.succinctProperties['cmis:objectId'];
        versionSeriesId = data.succinctProperties['cmis:versionSeriesId'];
      });
  });

  it('should update properties of documents', () => {
    return session.bulkUpdateProperties([docId], {
      'cmis:name': 'mod-test.txt'
    }).then(data => {
      assert(data, 'OK');
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.warn("Bulk update is not supported in this repository")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should get document content', () => {
    return session.getContentStream(docId).then(res => {
      res.text().then(data => {
        assert(data == txt, 'document content should be "' + txt + '"');
      });
    });
  });

  let copyId;
  it('should create a copy of the document', () => {
    return session.createDocumentFromSource(randomFolderId, docId, undefined, 'test-copy.txt')
      .then(data => {
        copyId = data.succinctProperties['cmis:objectId'];
      }).catch(err => {
        if (err.response) {
          return err.response.json().then(json => {
            assert(json.exception == 'notSupported', "not supported");
            console.warn("Create document from source is not supported in this repository")
          });
        } else {
          assert.isNotOk(err,'Promise error');
        }
      });
  });

  it('should get copied document content', () => {
    if (!copyId) {
      console.log("skipping")
      return;
    }
    return session.getContentStream(copyId).then(res => {
      return res.text().then(data => {
        assert(data == txt, 'copied document content should be "' + txt + '"');
      });
    });
  });

  it('should get document content URL', () => {
    assert(session.getContentStreamURL(docId).indexOf("content") != -1, "URL should be well formed");
  });

  it('should get renditions', () => {
    return session.getRenditions(docId).then(data => {
      assert(Array.isArray(data), 'should return an array');
    });
  });

  var checkOutId;
  it('should check out a document', () => {
    return session.checkOut(docId).then(data => {
      checkOutId = data.succinctProperties['cmis:objectId'];
      assert(checkOutId && checkOutId != docId, "checked out id should be different from document id")
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          let exc = json.exception;
          if (exc == 'constraint') {
            assert(json.message.indexOf('checked out') !== -1, "checked out");
            console.log("document already ckecked out");
          } else {
            assert(exc == 'notSupported', "not supported");
            console.log("checkout is not supported in this repository")
          }
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should cancel a check out ', () => {
    if (!checkOutId) {
      console.log("skipping")
      return;
    }
    return session.cancelCheckOut(checkOutId);
  });

  it('should check out a document (again)', () => {
    if (!checkOutId) {
      console.log("skipping")
      return;
    }
    return session.checkOut(docId).then(data => {
      checkOutId = data.succinctProperties['cmis:objectId'];
      assert(checkOutId && checkOutId != docId, "checked out id should be different from document id")
    });
  });

  it('should check in a document', () => {
    if (!checkOutId) {
      console.log("skipping")
      return;
    }
    return session.checkIn(checkOutId, true, 'test-checkedin.txt',
      txt, 'the comment!').then(data => {
        docId = data.succinctProperties['cmis:objectId'].split(";")[0];
        versionSeriesId = data.succinctProperties['cmis:versionSeriesId'];
      });
  });

  it('should get latest version of a version series', () => {
    if (!docId || !versionSeriesId) {
      console.log("skipping")
      return;
    }
    return session.getObjectOfLatestVersion(versionSeriesId)
      .then(data => {
        var latestVersionSeriesId = data.succinctProperties['cmis:versionSeriesId'];
        assert(latestVersionSeriesId, 'latest document should have a version series id');
        assert(versionSeriesId == latestVersionSeriesId, 'latest document should be in current version series');

        var latestDocId = data.succinctProperties['cmis:objectId'];
        assert(latestDocId, 'latest document should have an object id');
        assert(docId !== latestDocId, 'latest document should be the latest checked in document');

      });
  });

  it('should get object versions', () => {
    return session.getAllVersions(versionSeriesId).then(data => {
      assert(data[0].succinctProperties['cmis:versionLabel'] !== undefined, 'version label should be defined');
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'invalidArgument', "invalid argument");
          console.log("Specified document is not versioned")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should update document content', () => {
    txt = 'updated content';
    return session.setContentStream(docId, txt, true, 'update.txt').then(data => {
      assert(data, 'OK');
    });
  });

  let appended = " - appended";
  let changeToken;
  it('should append content to document', () => {
    return session.appendContentStream(docId, appended, true, 'append.txt').then(data => {
      changeToken = data.succinctProperties['cmis:changeToken'];
      assert(data, 'OK');
    }).catch(err => {
      appended = null;
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.log("append is not supported in this repository")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should get document appended content', () => {
    if (!appended) {
      console.log("skipping")
      return;
    }
    return session.getContentStream(docId).then(res => {
      return res.text().then(data => {
        assert(data == txt + appended, 'document content should be "' + txt + appended + '"');
      });
    });
  });

  it('should delete object content', () => {
    return session.deleteContentStream(docId, {
      changeToken: changeToken
    }).then(data => {
      assert(data, 'OK');
    });
  });

  it('should get object policies', () => {
    return session.getAppliedPolicies(docId).then(data => {
      assert(data, 'OK');
    });
  });

  it('should get object ACL', () => {
    return session.getACL(docId).then(data => {
      assert(data.aces !== undefined, 'aces should be defined');
    }).catch(err => {
      if (err.response) {
        return err.response.json().then(json => {
          assert(json.exception == 'notSupported', "not supported");
          console.log("get ACL is not supported in this repository")
        });
      } else {
        assert.isNotOk(err,'Promise error');
      }
    });
  });

  it('should delete a folder', () => {
    return session.deleteObject(secondChildId, true);
  });

  it('should delete a folder tree', () => {
    return session.deleteTree(randomFolderId, true, undefined, true);
  });

  it('should get latest changes', () => {
    return session.getContentChanges(session.defaultRepository.latestChangeLogToken)
      .then(data => {
        assert(data.objects !== undefined, "objects should be defined");
      });
  });

});


var ASSERT = require("assert");
var PATH = require("path");
var FS = require("fs");
var URL = require("url");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var Q = require("sourcemint-util-js/lib/q");
var SM = require("sourcemint-pm-sm/lib/sm");
var SM_PM = require("sourcemint-pm-sm/lib/pm");
var URI_PARSER = require("sourcemint-pm-sm/lib/uri-parser");
var FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");
var SPAWN = require("child_process").spawn;
var EXEC = require("child_process").exec;
var SSH_PM = require("sourcemint-pm-ssh/lib/pm");



exports.ssh = function(pm, options) {

    return Q.call(function() {

        var deferred = Q.defer();

        if (!pm.context.deploymentDescriptor.json.config || !pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"]) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"]`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }
        if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].username`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }
        if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].hostname`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }
        if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].sshPrivateKeyPath`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }
        if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].targetPath) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].targetPath`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }

        return SSH_PM.ssh(pm, {
            username: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username,
            hostname: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname,
            sshPrivateKeyPath: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath,
            initialPath: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].targetPath
        });
    });
}

exports.deploy = function(pm, options) {

    var deferred = Q.defer();

    var targetUri = options.targetUri;

    // TODO: Only allow deploy if no packages are linked in or git of linked in packages
    //       is in sync with latest published. Override this with --force.

    if (typeof targetUri === "undefined") {
        // No target was specified.
        // Look at program.json for information as to where to deploy to.

        if (!pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"]) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.program.descriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"]`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }

        if (!pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].adapter) {
            TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.program.descriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].adapter`." + "\0)");
            deferred.reject(true);
            return deferred.promise;
        }

        if (pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].platform) {
            pm.context.platformUri = pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].platform;
        }

        var provisioned = pm.context.deploymentDescriptor.json.config &&
                          pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"] &&
                          pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].provisioned;

        // Ensure credentials store is initialized.
        var done = pm.context.credentials.ready();

        if (provisioned !== true) {
            done = Q.when(done, function() {
                var deferred = Q.defer();

                var adapter = pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].adapter;

                // TODO: Install provisioning adapter on demand.
                if (adapter === "github.com/sourcemint/sdk-aws/0") {

                    return require("sourcemint-sdk-aws/lib/pm").deploy(pm, options).then(function(targetOptions) {

                        var programPathId = "TODO-USE-SOURCE-HOSTNAME" + pm.context.package.path;
                        // TODO: Use `pinf` module to obtain `uid`.
                        if (pm.context.program.descriptor.json.uid) {
                            var parsedUID = URL.parse(pm.context.program.descriptor.json.uid);
                            programPathId = parsedUID.hostname + parsedUID.path;
                        }
                        programPathId = programPathId.replace(/\//g, "+");
                        var targetPath = PATH.join(targetOptions.programsPath, programPathId);

                        TERM.stdout.writenl("Writing into to program descriptor '" + pm.context.deploymentDescriptor.path + "' at `config[\"github.com/sourcemint/deployer/0\"]`");

                        return pm.context.deploymentDescriptor.set(["config", "github.com/sourcemint/deployer/0", "username"], targetOptions.username).then(function() {
                        return pm.context.deploymentDescriptor.set(["config", "github.com/sourcemint/deployer/0", "hostname"], targetOptions.hostname).then(function() {
                        return pm.context.deploymentDescriptor.set(["config", "github.com/sourcemint/deployer/0", "sshPrivateKeyPath"], targetOptions.sshPrivateKeyPath).then(function() {
                        return pm.context.deploymentDescriptor.set(["config", "github.com/sourcemint/deployer/0", "targetPath"], targetPath).then(function() {
                        });
                        });
                        });
                        });
                    }).then(function() {
                        if (pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on &&
                            pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.postprovision)
                        {
                            var deferred = Q.defer();
                            var locator = pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.postprovision;
                            SM.for(PATH.dirname(pm.context.program.descriptor.path)).require(locator, function(err, MODULE) {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }
                                var opts = UTIL.copy(options);
                                opts.username = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username;
                                opts.hostname = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname;
                                opts.sshPrivateKeyPath = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath;
                                Q.when(MODULE.main(pm, opts), deferred.resolve, deferred.reject);
                            });
                            return deferred.promise;
                        }
                    }).then(function() {
                        return pm.context.deploymentDescriptor.set(["config", "github.com/sourcemint/deployer/0", "provisioned"], true);
                    });
                } else {
                    TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Adapter '" + adapter + "' specified in program descriptor '" + pm.context.program.descriptor.path + "' at `config[\"github.com/sourcemint/deployer/0\"].adapter` is not supported." + "\0)");
                    deferred.reject(true);
                }

                return deferred.promise;
            });
        }

        // TODO: If only `provisioned` is set populate the other info (pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"]) by contacting the server.

        Q.when(done, function() {

            if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username) {
                TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].username`." + "\0)");
                deferred.reject(true);
                return deferred.promise;
            }
            if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname) {
                TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].hostname`." + "\0)");
                deferred.reject(true);
                return deferred.promise;
            }
            if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath) {
                TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].sshPrivateKeyPath`." + "\0)");
                deferred.reject(true);
                return deferred.promise;
            }
            if (!pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].targetPath) {
                TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Program descriptor '" + pm.context.deploymentDescriptor.path + "' does not specify `config[\"github.com/sourcemint/deployer/0\"].targetPath`." + "\0)");
                deferred.reject(true);
                return deferred.promise;
            }

            return Q.call(function() {

                if (pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on &&
                    pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.predeploy)
                {
                    var deferred = Q.defer();
                    var locator = pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.predeploy;
                    SM.for(PATH.dirname(pm.context.program.descriptor.path)).require(locator, function(err, MODULE) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        var opts = UTIL.copy(options);
                        opts.username = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username;
                        opts.hostname = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname;
                        opts.sshPrivateKeyPath = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath;
                        Q.when(MODULE.main(pm, opts), deferred.resolve, deferred.reject);
                    });
                    return deferred.promise;
                }
            }).then(function() {

                // TODO: Install program deployment adapter on demand.
                return require("sourcemint-pm-rsync/lib/pm").deploy(pm, {
                    username: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username,
                    hostname: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname,
                    sshPrivateKeyPath: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath,
                    targetPath: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].targetPath
                }).then(function() {

                    if (pm.context.package.descriptor.json.scripts &&
                        pm.context.package.descriptor.json.scripts.postdeploy)
                    {
                        return SSH_PM.call(pm, {
                            username: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username,
                            hostname: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname,
                            sshPrivateKeyPath: pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath,
                            binName: "sm",
                            scriptPath: "run-script postdeploy " + pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].targetPath
                        });
                    }
                });
            });

        }).then(function() {
            if (pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on &&
                pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.postdeploy)
            {
                var deferred = Q.defer();
                var locator = pm.context.program.descriptor.json.config["github.com/sourcemint/deployer/0"].on.postdeploy;
                SM.for(PATH.dirname(pm.context.program.descriptor.path)).require(locator, function(err, MODULE) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    var opts = UTIL.copy(options);
                    opts.username = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].username;
                    opts.hostname = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].hostname;
                    opts.sshPrivateKeyPath = pm.context.deploymentDescriptor.json.config["github.com/sourcemint/deployer/0"].sshPrivateKeyPath;
                    Q.when(MODULE.main(pm, opts), deferred.resolve, deferred.reject);
                });
                return deferred.promise;
            }
        }).then(deferred.resolve, deferred.reject);
    }
    else
    if (/^\.{0,2}\//.test(targetUri) && PATH.existsSync(PATH.dirname(PATH.resolve(targetUri)))) {

        var targetPath = PATH.resolve(targetUri);

        if (PATH.existsSync(targetPath)) {
            
            if (options.delete) {
                TERM.stdout.writenl("\0cyan(Deleting path '" + targetPath + "'.\0)");
                FS_RECURSIVE.rmdirSyncRecursive(targetPath);
            } else {
                TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Target path '" + targetPath + "' already exists! Use -d to delete what is already there." + "\0)");
                deferred.reject(true);
                return deferred.promise;
            }
        }
        
        var packagePath = pm.context.package.path;

        FS.mkdirSync(targetPath);
        var targetSourcePath = PATH.join(targetPath, "source");
        
        // TODO: The more exact info we have available the more specific the archive name should be.
        var name = [];
        if (pm.context.package.descriptor.json.name) {
            name.push(pm.context.package.descriptor.json.name);
        }
        name.push("deploy");
        var targetArchivePath = PATH.join(targetPath,  name.join("-") + ".tar.gz");

        function copy() {

            var deferred = Q.defer();

            var tmpTargetSourcePath = targetSourcePath + "~" + new Date().getTime();
            var tmpTargetSourceIgnorePath = tmpTargetSourcePath + "~ignore";
    
            // NOTE: Do not respect .npmignore ("publishing ignore file") as paths ignored should likely be kept for "deployment (with built packages)" purposes.
            if (PATH.existsSync(PATH.join(packagePath, ".deployignore"))) {

                TERM.stdout.writenl("\0cyan(Using deploy ignore file from: " + PATH.join(packagePath, ".deployignore") + "\0)");
                
                FS.writeFileSync(tmpTargetSourceIgnorePath, FS.readFileSync(PATH.join(packagePath, ".deployignore")));
            } else {
                var ignores = [
                    ".git",
                    ".sourcemint",
                    "*~backup-*"
                ];
                TERM.stdout.writenl("\0cyan(NOTICE: Package '" + packagePath + "' does not have a '.deployignore' file. Using a temporary one that excludes: " + ignores.join(", ") + "\0)");
                FS.writeFileSync(tmpTargetSourceIgnorePath, ignores.join("\n"));
            }

            TERM.stdout.writenl("\0cyan(Copying from '" + packagePath + "' to '" + targetSourcePath + "'.\0)");

            var proc = SPAWN("rsync", [
                "--stats",
                "-r",
                "--copy-links",
                "--exclude-from", tmpTargetSourceIgnorePath,
                packagePath + "/",
                tmpTargetSourcePath
            ]);
    
            proc.on("error", function(err) {
                deferred.reject(err);
            });
            proc.stdout.on("data", function(data) {
                process.stdout.write(data);
            });
            proc.stderr.on("data", function(data) {
                process.stderr.write(data);
            });
            proc.on("exit", function(code) {
                if (code !== 0) {
                    deferred.reject(new Error("Rsync error: " + code));
                    return;
                }
                
                FS.unlinkSync(tmpTargetSourceIgnorePath);
                FS.renameSync(tmpTargetSourcePath, targetSourcePath);
                
                deferred.resolve();
            });

            return deferred.promise;
        }
        
        function archive() {

            var deferred = Q.defer();

            var tmpTargetArchivePath = targetArchivePath + "~" + new Date().getTime();

            TERM.stdout.writenl("\0cyan(Creating archive at '" + targetArchivePath + "' from '" + targetSourcePath + "'.\0)");

            var proc = SPAWN("tar", [
                "-czf",
                tmpTargetArchivePath,
                PATH.basename(targetSourcePath)
            ], {
                cwd: PATH.dirname(targetSourcePath)
            });
   
            proc.on("error", function(err) {
                deferred.reject(err);
            });
            proc.stdout.on("data", function(data) {
                process.stdout.write(data);
            });
            proc.stderr.on("data", function(data) {
                process.stderr.write(data);
            });
            proc.on("exit", function(code) {
                if (code !== 0) {
                    deferred.reject(new Error("Tar error: " + code));
                    return;
                }
                FS.renameSync(tmpTargetArchivePath, targetArchivePath);
                deferred.resolve();
            });

            return deferred.promise;
        }

        return copy().then(function() {

            if (options["no-archive"] === true) {
                return Q.ref();
            }

            return archive().then(function() {

                var deferred = Q.defer();

                EXEC("md5 " + targetArchivePath, function(err, stdout, stderr) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    var m = stdout.match(/^MD5 \((.*?)\) = ([\w\d]*)[\n$]/);

                    FS.writeFileSync(targetArchivePath + ".checksum", "md5:" + m[2]);
                    
                    var size = ("" + (FS.statSync(targetArchivePath).size / 1024 / 1000)).replace(/^(\d+(\.\d{1,2})?)\d*$/,"$1");

                    TERM.stdout.writenl("\0yellow(Deploy archive size: " + size + " MB\0)");

                    deferred.resolve();
                });            
                return deferred.promise;
            });
        });
    }
    else {
        TERM.stdout.writenl("\0red(" + "[sm] ERROR: " + "Target (or parent of) '" + targetUri + "' not found or supported!" + "\0)");
        deferred.reject(true);
    }
    return deferred.promise;
}

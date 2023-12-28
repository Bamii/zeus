extern crate mac_address;

use base64::{engine::general_purpose, Engine as _};
use dirs;
use hex;
use mac_address::get_mac_address;
use serde::Deserialize;
use serde_json;
use serde_yaml;
use sha256::digest;
use smol;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs;
use std::path;
use std::process;
use std::u8;

use crate::models::package::{PackageDetailsLocal, PackageManifest};
use crate::models::package_manager_repository::{
    PackageManagerRepository, PackageManagerRepositoryActions,
};

use crate::package_managers::apt::default as apt;
use crate::package_managers::choco::default as choco;
use crate::package_managers::default_command_only::default as default_command_only;
use crate::package_managers::default_flag_only::default as default_flag_only;
use crate::package_managers::pacman::default as pacman;
use crate::package_managers::rpm::default as rpm;
//use crate::package_managers::scoop::default as scoop;

#[derive(Debug, Deserialize)]
pub struct LatestConfigResponse {
    status: String,
    message: String,
}

pub fn create_package_repository() -> PackageManagerRepository {
    PackageManagerRepository {
        package_managers: HashMap::from([
            ("default_commands_only".to_string(), default_command_only()),
            ("default_flags_only".to_string(), default_flag_only()),
        ]),
    }
}

pub fn setup_package_repository() -> PackageManagerRepository {
    let mut packages_repository = create_package_repository();

    //packages_repository.register("scoop", scoop());
    packages_repository.register("rpm", rpm());
    packages_repository.register("pacman", pacman());
    packages_repository.register("apt", apt());
    packages_repository.register("choco", choco());
    packages_repository.register("apt-get", apt());

    packages_repository
}

pub fn run_command(cmds: &Vec<String>) -> Result<process::Output, std::io::Error> {
    if cfg!(target_os = "windows") {
        let arr: Vec<&str> = vec!["/C"];
        let command = [arr, cmds.iter().map(|a| a.as_str()).collect::<Vec<&str>>()]
            .concat()
            .into_iter();

        process::Command::new("cmd").args(command).output()
    } else {
        let arr: Vec<&str> = vec!["-c"];
        let xcommand = [cmds
            .iter()
            .map(|a| a.as_str())
            .collect::<Vec<&str>>()
            .join(" ")];
        let bcommand = xcommand.iter().map(|a| a.as_str()).collect::<Vec<&str>>();
        let command = [arr, bcommand].concat().into_iter();
        process::Command::new("sh").args(command).output()
    }
}

pub fn install_package_manager(_package_manager: String) {
    // fetch script from server, install script.
    // let url = String::from("https://dummyjson.com/quotes");
    // let response = reqwest::get(url).await?;
}

pub fn get_zeus_config_path() -> String {
    let mut config_path = path::PathBuf::from(get_zeus_dir());
    config_path.push("config.yaml");
    String::from(config_path.to_str().unwrap())
}

pub fn get_bolt_path() -> String {
    let mut config_path = path::PathBuf::from(get_zeus_dir());
    config_path.push("bolt.txt");
    String::from(config_path.to_str().unwrap())
}

pub fn get_zeus_dir() -> String {
    let mut zeus_dir = path::PathBuf::from(dirs::home_dir().unwrap());
    zeus_dir.push(".zeus");

    String::from(zeus_dir.as_path().to_str().unwrap_or(""))
}

pub fn get_zeus_config_string() -> String {
    let content = fs::read(get_zeus_config_path()).unwrap_or(vec![]);
    String::from_utf8(content).unwrap_or("".to_string())
}

pub fn get_zeus_config() -> PackageManifest {
    let config_string = get_zeus_config_string();

    serde_yaml::from_str(config_string.as_str()).unwrap_or(PackageManifest {
        version: String::from("1"),
        packages: HashMap::new(),
    })
}

pub fn olympus() -> String {
    String::from("https://zeus.bami.lol") + "/config/latest"
    //String::from("http://localhost:3001") + "/config/latest"
}

pub fn heimdall() -> String {
    String::from("https://zeus.bami.lol") + "/link"
    //String::from("http://localhost:3001") + "/link"
}

fn _bolt() -> String {
    let content = fs::read(get_bolt_path()).unwrap_or(vec![]);
    String::from_utf8(content).unwrap_or("".to_string())
}

pub fn make_authenticated_request() -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();

    let mut auth_value = reqwest::header::HeaderValue::from_str(_bolt().as_str()).unwrap();
    auth_value.set_sensitive(true);
    headers.insert(reqwest::header::AUTHORIZATION, auth_value);

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
}

pub fn ensure_zeus_files() {
    ensure_root_folder();
    let _ = get_zeus_dir();

    let bolt = get_bolt_path();
    let bolt_location = path::Path::new(&bolt);
    match bolt_location.try_exists() {
        Ok(true) => {}
        _ => {
            let _ = fs::write(bolt_location, "");
        }
    }

    let config = get_zeus_config_path();
    let config_location = path::Path::new(&config);
    match config_location.try_exists() {
        Ok(true) => {}
        _ => {
            let _ = fs::write(config_location, "");
        }
    };
}

fn ensure_root_folder() {
    let root = get_zeus_dir();
    let _ = fs::create_dir_all(root);
}

pub fn update_local_file_config(content: &str) {
    println!("");
    println!("--------------------------------");
    println!("-- updating zeus config to disk... ");

    ensure_root_folder();
    let write_path = get_zeus_config_path();
    match fs::write(write_path, content) {
        Ok(_) => {}
        Err(_) => {
            // some retry mechanism.
            println!("error!!");
        }
    }

    println!("--------------------------------");
    println!("-- done updating zeus config...");
    println!("===============================");
    //println!("")
}

fn update_bolt(trident: &str) {
    ensure_root_folder();
    let write_path = get_bolt_path();
    match fs::write(write_path, trident) {
        Ok(_) => {}
        Err(_) => {
            // some retry mechanism
            println!("error!!");
        }
    }
}

pub fn update_cloud_file_config(content: &str) {
    smol::block_on(async {
        println!("");
        println!("--------------------------------");
        println!("-- updating zeus config to the cloud...");

        // -------------------------------------------------------------------
        let mut body = HashMap::new();
        body.insert("config", general_purpose::STANDARD_NO_PAD.encode(content));
        body.insert("fingerprint", get_system_fingerprint());

        let res = make_authenticated_request()
            .post(olympus())
            .json(&body)
            .send()
            .await;

        println!("--------------------------------");
        match res {
            Ok(res) => {
                let content_: LatestConfigResponse = match res.json().await {
                    Ok(val) => val,
                    Err(_) => {
                        panic!("idk");
                    }
                };
                println!("{}", content_.message);
            }
            Err(_) => {
                println!("-- could not update cloud config... ");
                println!("-- if zeusd is running, the request will be automatically be retried.");
                println!("--- to manually retry it, run 'zeus config update'");
            }
        }
        println!("===============================");
        println!("");
        println!("");
    })
}

pub fn link_computer(bolt: &str) {
    smol::block_on(async {
        let mut body = HashMap::new();
        body.insert("fingerprint", get_system_fingerprint());
        body.insert("platform", get_system_platform());

        println!("");
        println!("--------------------------------");
        println!("-- updating zeus bolt ...");
        println!("--------------------------------");
        println!("");
        update_bolt(bolt);
        let res = make_authenticated_request()
            .post(heimdall())
            .json(&body)
            .send()
            .await
            .unwrap();

        match &res.json::<LatestConfigResponse>().await {
            Ok(xx) => match xx.status.as_str() {
                "success" => {
                    println!("successfully linked this computer!");
                    println!("-- install away!");
                    println!("");
                }
                _ => {
                    update_bolt("");
                    println!("an error occured while linking this computer");
                    println!("");
                }
            },
            Err(_) => {
                update_bolt("");
                println!("an error occured while linking this computer");
                println!("");
            }
        }

        println!("===============================");
        println!("");
    });
}

pub async fn get_and_install_latest_cloud_config(packages: &PackageManagerRepository) {
    let platform = get_system_platform();
    let local_config: PackageManifest = get_zeus_config();
    let cloud_config: Option<PackageManifest> = get_latest_cloud_config().await;

    if cloud_config.is_none() {
        println!("");
        return ();
    }

    let cloud_config = cloud_config.unwrap();

    let content = serde_yaml::to_string(&cloud_config).unwrap();
    update_local_file_config(content.as_str());

    let cloud_config_packages: Vec<PackageDetailsLocal> = cloud_config
        .packages
        .values()
        .map(|a| (*a).clone().into())
        .map(|mut a: PackageDetailsLocal| {
            a.typer = String::from("new");
            a
        })
        .collect::<Vec<PackageDetailsLocal>>()
        .into_iter()
        .filter(|a| *a.platform == platform)
        .collect();

    let local_config_packages: Vec<PackageDetailsLocal> = local_config
        .packages
        .values()
        .map(|a| (*a).clone().into())
        .map(|mut a: PackageDetailsLocal| {
            a.typer = String::from("old");
            a
        })
        .collect::<Vec<PackageDetailsLocal>>()
        .into_iter()
        .filter(|a| *a.platform == platform)
        .collect();

    let mut package_collective = [&local_config_packages[..], &cloud_config_packages[..]].concat();

    // sort and group by name
    package_collective.sort_by(|a, b| a.name.partial_cmp(&b.name).unwrap());
    let group_by_name = package_collective.group_by(|a, b| a.name.cmp(&b.name) == Ordering::Equal);

    let mut diffed: Vec<&PackageDetailsLocal> = vec![];
    for group in group_by_name {
        let mut _action = "install";

        match group.len() {
            1 => {
                let vector = group.get(0).unwrap();
                diffed.push(vector);

                match vector.typer.as_str() {
                    "new" => {}
                    _ => _action = "uninstall",
                };
            }

            _ => {
                let new = match group.get(0).unwrap().typer.as_str() {
                    "new" => group.get(0),
                    _ => group.get(1),
                };

                let matched = group.get(0).unwrap().hash == group.get(1).unwrap().hash;
                match matched {
                    true => {}
                    false => {
                        diffed.push(new.unwrap());
                    }
                };
            }
        }
    }

    // sort the diffed packages and group them by vendors,
    diffed.sort_by(|a, b| a.vendor.partial_cmp(&b.vendor).unwrap());
    let group_by_vendor = diffed.group_by(|a, b| a.vendor.cmp(&b.vendor) == Ordering::Equal);

    for by_vendor in group_by_vendor {
        let _vendor = &by_vendor.get(0).unwrap().vendor;
        let vendor_repository = packages.get(_vendor).unwrap();
        let mut rs: Vec<&PackageDetailsLocal> = by_vendor.iter().map(|a| *a).collect();

        rs.sort_by(|a, b| a.typer.partial_cmp(&b.typer).unwrap());
        let group_by_typer = rs.group_by(|a, b| a.typer.cmp(&b.typer) == Ordering::Equal);

        for installation in group_by_typer {
            let packages: Vec<String> = installation[..]
                .iter()
                .map(|a| a.name.to_string())
                .collect();

            match &installation.get(0).unwrap().typer.as_str() {
                &"new" => {
                    for package in &packages {
                        let pkg = package.to_string();
                        println!("installing {:?}", &installation.get(0).unwrap().name);
                        let _ = (vendor_repository.install)(&vec![
                            installation.get(0).unwrap().vendor.clone(),
                            pkg,
                        ])
                        .unwrap();
                    }
                }
                &"old" => {
                    for package in &packages {
                        let pkg = package.clone();
                        println!("uninstalling {:?}", &installation.get(0).unwrap().name);
                        let _ = (vendor_repository.uninstall)(&vec![
                            installation.get(0).unwrap().vendor.clone(),
                            pkg,
                        ])
                        .unwrap();
                    }
                }
                _ => panic!("never will happen"),
            };

            println!("-----------------------------");
        }

        println!("");
    }
}

pub async fn get_latest_cloud_config() -> Option<PackageManifest> {
    let _content = fs::read(get_zeus_config_path()).unwrap();
    let content = String::from_utf8(_content).unwrap();

    let mut body = HashMap::new();
    let hash = digest(&content);
    body.insert("current_version", hash);
    body.insert("fingerprint", get_system_fingerprint());

    let res = make_authenticated_request()
        .get(olympus())
        .json(&body)
        .send()
        .await
        .unwrap();

    match &res.text().await {
        Err(_) => None,
        Ok(res) => {
            let already_has_config = serde_json::from_str::<LatestConfigResponse>(&res);

            match already_has_config {
                Ok(value) => {
                    println!("{}", value.message);
                    None
                }
                Err(_) => match serde_yaml::from_str::<PackageManifest>(&res) {
                    Ok(parsed) => Some(parsed),
                    _ => None,
                },
            }
        }
    }
}

pub fn display_banner() {
    println!("--------------------------------");
    println!("|              zeus            |");
    println!("--------------------------------");
    println!("");
}

pub fn get_system_fingerprint() -> String {
    let fingerprint = get_system_platform();

    match get_mac_address() {
        Ok(Some(ma)) => {
            let my_str = hex::encode(ma.bytes().to_vec());
            digest(String::from(my_str) + &fingerprint)
        }
        _ => panic!("could not get system mac address."),
    }
}

pub fn get_system_platform() -> String {
    if cfg!(target_os = "windows") {
        String::from("windows")
    } else if cfg!(target_os = "macos") {
        String::from("macos")
    } else {
        String::from("linux")
    }
}

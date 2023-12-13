#![feature(ascii_char)]

extern crate mac_address;

use base64::{engine::general_purpose, Engine as _};
use mac_address::get_mac_address;
use reqwest;
use hex;
use serde::Deserialize;
use serde_json;
use serde_yaml;
use sha256::{digest, try_digest};
use smol;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::u8;
use std::fmt::Display;
use std::path;
use std::process;

use crate::models::package::{new as new_package_manifest, PackageManifest};
use crate::models::package_manager_repository::{
    PackageManagerRepository, PackageManagerRepositoryActions,
};

use crate::package_managers::apt::default as apt;
use crate::package_managers::choco::default as choco;
use crate::package_managers::default::default as default_commander;
use crate::package_managers::default_command_only::default as default_command_only;
use crate::package_managers::default_flag_only::default as default_flag_only;
use crate::package_managers::pm::default as pacman;
use crate::package_managers::rpm::default as rpm;
use crate::package_managers::scoop::default as scoop;

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

    packages_repository.register("scoop", scoop());
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
        let command = [arr, cmds.iter().map(|a| a.as_str()).collect::<Vec<&str>>()]
            .concat()
            .into_iter();

        process::Command::new("sh").args(command).output()
    }
}

pub async fn install_package_manager(_package_manager: String) {
    // fetch script from server, install script.
    let url = String::from("https://dummyjson.com/quotes");
    //let response = reqwest::get(url).await?;
}

pub fn get_zeus_config_path() -> String {
    let mut config_path = path::PathBuf::from(get_zeus_dir());
    config_path.push("config.yaml");
    String::from(config_path.to_str().unwrap())
}

pub fn get_zeus_dir() -> String {
    if cfg!(target_os = "windows") {
        String::from(path::PathBuf::from(r"C:\.zeus").as_path().to_str().unwrap())
    } else {
        String::from(
            path::PathBuf::from("/etc/.zeus")
                .as_path()
                .to_str()
                .unwrap(),
        )
    }
}

pub fn get_zeus_config_string() -> String {
    let content = fs::read(get_zeus_config_path()).unwrap_or(vec![]);
    String::from_utf8(content).unwrap()
}

pub fn get_zeus_config() -> PackageManifest {
    let config_string = get_zeus_config_string();

    serde_yaml::from_str(config_string.as_str()).unwrap_or(PackageManifest {
        version: String::from("1"),
        packages: HashMap::new(),
    })
}

pub fn olympus() -> String {
    String::from("http://localhost:3001") + "/config/latest"
}

pub fn heimdall() -> String {
    String::from("http://localhost:3001") + "/link"
}

pub fn make_authenticated_request() -> reqwest::Client {
    let mut headers = reqwest::header::HeaderMap::new();

    let mut auth_value = reqwest::header::HeaderValue::from_static("3ZUbhJHFL1QgjMM9svBhy9uF");
    auth_value.set_sensitive(true);
    headers.insert(reqwest::header::AUTHORIZATION, auth_value);

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
}

pub fn update_local_file_config(content: &str) {
    println!("");
    println!("--------------------------------");
    println!("-- updating zeus config to disk...");

    let root = get_zeus_dir();
    let _ = fs::create_dir_all(root);

    let write_path = get_zeus_config_path();
    match fs::write(write_path, content) {
        Ok(_) => {}
        Err(_) => {
            // some retry mechanism...
            println!("error!!");
        }
    }

    println!("--------------------------------");
    println!("-- done updating zeus config...");
    println!("===============================");
    //println!("");
}

pub fn update_cloud_file_config(content: &str) {
    smol::block_on(async {
        println!("");
        println!("--------------------------------");
        println!("-- updating zeus config to the cloud...");
        println!("--------------------------------");

        // -------------------------------------------------------------------
        let mut body = HashMap::new();
        body.insert("config", general_purpose::STANDARD_NO_PAD.encode(content));

        let res = make_authenticated_request()
            .post(olympus())
            .json(&body)
            .send()
            .await;

        println!("--------------------------------");
        match res {
            Ok(res) => {
                let content_: LatestConfigResponse = res.json().await.unwrap();
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

pub fn link_computer() {
    smol::block_on(async {
        let mut body = HashMap::new();
        body.insert("fingerprint", get_system_fingerprint());
        body.insert("platform", get_system_platform());

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
                    println!("an error occured while linking this computer");
                    println!("");
                }
            },
            Err(xx) => {
                println!("an error occured while linking this computer");
                println!("");
            }
        }
    });
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
            println!("{:?}", my_str);

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

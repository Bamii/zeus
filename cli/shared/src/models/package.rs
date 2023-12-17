use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::utils::get_system_platform;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PackageDetails {
    pub name: String,
    pub version: String,
    pub flags: Vec<String>,
    pub hash: String,
    pub vendor: String,
    pub platform: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PackageDetailsLocal {
    pub name: String,
    pub version: String,
    pub flags: Vec<String>,
    pub vendor: String,
    pub typer: String,
    pub platform: String,
    pub hash: String,
}

impl From<PackageDetails> for PackageDetailsLocal {
    fn from(p: PackageDetails) -> Self {
        Self {
            name: p.name,
            version: p.version,
            flags: p.flags.into(),
            vendor: p.vendor,
            hash: p.hash,
            platform: p.platform,
            typer: String::from(""),
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PackageManifest {
    pub version: String,
    pub packages: HashMap<String, PackageDetails>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct PackageManifest2 {
    pub version: String,
    pub packages: Vec<PackageDetails>,
}

pub fn new() -> PackageManifest {
    let mut map = HashMap::new();
    map.insert(
        "terraform".to_string(),
        PackageDetails {
            name: "terraform".to_string(),
            version: "343klf".to_string(),
            flags: vec![],
            hash: "".to_string(),
            platform: get_system_platform(),
            vendor: "choco".to_string(),
        },
    );

    PackageManifest {
        version: String::from("1"),
        packages: map,
    }
}

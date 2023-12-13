use crate::models::package_manager::{PackageManager, Parse};
use std::collections::HashMap;

pub struct PackageManagerRepository {
    pub package_managers: HashMap<String, PackageManager>,
}

pub trait PackageManagerRepositoryActions {
    fn get(&self, key: &str) -> Option<&PackageManager>;
    fn register(&mut self, key: &str, package: PackageManager);
}

impl PackageManagerRepositoryActions for PackageManagerRepository {
    fn get(&self, key: &str) -> Option<&PackageManager> {
        match self.package_managers.get(key) {
            Some(package) => Some(package),
            None => {
                let default_pckg = self.package_managers.get("default");
                let default_command = self.package_managers.get("default_commands_only");
                let default_flags = self.package_managers.get("default_flags_only");

                [default_pckg, default_command, default_flags]
                    .into_iter()
                    .find(|&a| a.map(|c| c.has_package(key)).unwrap_or(false))
                    .flatten()
            }
        }
    }

    fn register(&mut self, key: &str, package: PackageManager) {
        self.package_managers.insert(String::from(key), package);
    }
}
